import { Telegraf, Context } from "telegraf";

import { Client } from "./api";
import { sleep } from "./lib";
import { logger } from "./logger";
import {
    buildBlock,
    buildHero,
    Hero,
    IGetBlockMapPayload,
    IHeroUpdateParams,
    IMapTile,
    Squad,
    TreasureMap,
} from "./model";
import {
    IStartExplodePayload,
    ISyncBombermanPayload,
    parseGetBlockMapPayload,
    parseStartExplodePayload,
    parseSyncBombermanPayload,
} from "./parsers";

const DEFAULT_TIMEOUT = 120000;
const MIN_HERO_ENERGY = 20;
const MAX_WORKING_HEROES = 5;
const HISTORY_SIZE = 5;

type ExplosionByHero = Map<
    number,
    {
        timestamp: number;
        tile: IMapTile;
    }
>;

const TELEGRAF_COMMANDS = ["rewards", "exit", "stats"] as const;

type ETelegrafCommand = typeof TELEGRAF_COMMANDS[number];

export class TreasureMapBot {
    private client!: Client;
    private map!: TreasureMap;
    private squad!: Squad;
    private telegraf?: Telegraf;
    private selection: Hero[];
    private explosionByHero: ExplosionByHero;
    private history: IMapTile[];
    private index: number;
    private shouldRun: boolean;
    private lastAdventure: number;
    private walletId: string;
    private telegramKey?: string;

    constructor(walletId: string, telegramKey?: string) {
        this.walletId = walletId
        this.telegramKey = telegramKey
        this.client = new Client(walletId, DEFAULT_TIMEOUT);
        this.map = new TreasureMap({ blocks: [] });
        this.squad = new Squad({ heroes: [] });

        this.explosionByHero = new Map();
        this.selection = [];
        this.history = [];
        this.index = 0;
        this.shouldRun = false;
        this.lastAdventure = 0;

        if (telegramKey) this.initTelegraf(telegramKey);
        this.reset();
    }

    stop() {
        this.shouldRun = false;
    }

    initTelegraf(telegramKey: string) {
        logger.info("Starting telegraf...");
        this.telegraf = new Telegraf(telegramKey);

        process.once("SIGINT", () => this.telegraf?.stop("SIGINT"));
        process.once("SIGTERM", () => this.telegraf?.stop("SIGTERM"));

        TELEGRAF_COMMANDS.forEach((command) =>
            this.telegraf?.command(
                command,
                this.handleTelegraf.bind(this, command)
            )
        );

        this.telegraf.launch();
    }

    async getRewards() {
        if (this.client.isConnected) {
            const results: { [key: string]: number } = {}
            const rewards = await this.client.getReward();

            rewards.map((reward) => results[`${reward.type}`] = reward.value)

            return results
        }

        return null
    }

    async getStats() {
        return {
            workingHeroes: this.workingSelection.length,
            map: this.map.toString(),
            idx: this.index
        }
    }

    async getConfig() {
        return {
            walletId: this.walletId,
            telegramKey: this.telegramKey
        }
    }

    private async handleTelegraf(command: ETelegrafCommand, context: Context) {
        logger.info(`Running command ${command} from ${context.from?.id}.`);

        const now = Date.now() / 1000;
        const timedelta = now - (context.message?.date || 0);

        if (timedelta >= 30) {
            logger.info(`Ignoring message ${context.message?.message_id}`);
            return;
        }

        if (command === "exit") {
            await context.reply("Exiting in 5 seconds...");
            this.shouldRun = false;
            await sleep(5000);
            await this.telegraf?.stop();
            process.exit(0);
        } else if (command === "rewards") {
            if (this.client.isConnected) {
                const rewards = await this.client.getReward();
                const message =
                    "Rewards:\n" +
                    rewards
                        .map((reward) => `${reward.type}: ${reward.value}`)
                        .join("\n");

                await context.reply(message);
            } else {
                await context.reply("Not connected, please wait");
            }
        } else if (command === "stats") {
            const message =
                `Working heroes: ${this.workingSelection.length}\n` +
                `Map: ${this.map.toString()}\n` +
                `IDX: ${this.index}`;

            await context.reply(message);
        } else {
            await context.reply("Command not implemented");
        }
    }

    get workingSelection() {
        return this.selection.filter(
            (hero) => hero.state === "Work" && hero.energy > 0
        );
    }

    nextId() {
        return this.index++;
    }

    nextHero() {
        return this.workingSelection[
            this.nextId() % this.workingSelection.length
        ];
    }

    async logIn() {
        logger.info("Logging in...");
        await this.client.login();
        logger.info("Logged in successfully");
    }

    async refreshHeroSelection() {
        logger.info("Refreshing heroes");
        await this.client.syncBomberman();

        this.selection = this.squad.byState("Work");

        if (this.selection.length < MAX_WORKING_HEROES) {
            for (const hero of this.squad.byState("Sleep")) {
                if (hero.energy < MIN_HERO_ENERGY) continue;

                logger.info(`Sending hero ${hero.id} to work`);
                await this.client.goWork(hero.id);
                this.selection.push(hero);

                if (this.selection.length >= MAX_WORKING_HEROES) break;
            }
        }

        logger.info(`Sent ${this.selection.length} heroes to work`);
    }

    async refreshMap() {
        logger.info(`Refreshing map...`);
        if (this.map.totalLife <= 0) {
            this.resetState();
            logger.info(JSON.stringify(await this.client.getReward()));
        }
        await this.client.getBlockMap();
        logger.info(`Current map state: ${this.map.toString()}`);
    }

    nextLocation(hero: Hero) {
        const locations = this.map
            .getHeroDamageForMap(hero)
            .filter(({ damage }) => damage > 0);

        const selected =
            locations.length <= HISTORY_SIZE
                ? locations[0]
                : locations.filter(
                    ({ tile: option }) =>
                        !this.history.find(
                            (tile) =>
                                tile.i === option.i && tile.j === option.j
                        )
                )[0];

        return selected;
    }

    canPlaceBomb(hero: Hero, location: IMapTile) {
        const entry = this.explosionByHero.get(hero.id);
        if (!entry) return true;

        const distance =
            Math.abs(location.i - entry.tile.i) +
            Math.abs(location.j - entry.tile.j);

        const timedelta = (distance / hero.speed) * 1000;
        const elapsed = Date.now() - entry.timestamp;
        return elapsed >= timedelta;
    }

    async placeBomb(hero: Hero, location: IMapTile) {
        logger.info(
            `Hero ${hero.id} ${hero.energy}/${hero.maxEnergy} will place ` +
            `bomb on (${location.i}, ${location.j})`
        );

        const { energy } = await this.client.startExplode({
            heroId: hero.id,
            bombId: 0,
            blocks: [],
            i: location.i,
            j: location.j,
        });

        if (energy <= 0) {
            logger.info(`Sending hero ${hero.id} to sleep`);
            await this.client.goSleep(hero.id);
        }

        this.explosionByHero.set(hero.id, {
            timestamp: Date.now(),
            tile: location,
        });

        this.history.push(location);
        while (this.history.length > HISTORY_SIZE) this.history.shift();
    }

    async placeBombs() {
        while (this.map.totalLife > 0 && this.workingSelection.length > 0) {
            const hero = this.nextHero();
            const location = this.nextLocation(hero);

            if (this.canPlaceBomb(hero, location.tile)) {
                await this.placeBomb(hero, location.tile);
            } else {
                logger.info(`Hero ${hero.id} cannot place bomb now.`);
            }

            logger.info(this.map.toString());
            await sleep(1000);
        }
    }

    async adventure() {
        const rewards = await this.client.getReward();
        const keys = rewards.filter((reward) => reward.type === "Key")[0];

        logger.info(`Adventure mode iteration`);

        if (!keys || keys.value === 0) {
            logger.info(`No keys to play right now.`);
            return;
        }

        const amount = Math.floor(keys.value);

        for (let i = 0; i < amount; i++) {
            const details = await this.client.getStoryDetails();
            const hero = this.squad.rarest;
            const level = Math.min(details.max_level + 1, 45);

            logger.info(`Will play level ${level} with hero ${hero.id}`);

            await this.client.getStoryMap(hero.id, level);
            await sleep(5000);
            await this.client.enterDoor();

            logger.info(`Finished Adventure mode`);
        }
    }

    async loop() {
        this.shouldRun = true;
        await this.logIn();
        await this.refreshMap();
        await this.refreshHeroSelection();

        do {
            if (this.map.totalLife <= 0) await this.refreshMap();
            if (this.workingSelection.length === 0)
                await this.refreshHeroSelection();

            if (Date.now() > this.lastAdventure + 10 * 60 * 1000) {
                this.lastAdventure = Date.now();

                await this.adventure();
            }

            logger.info("Opening map...");
            await this.client.startPVE();

            if (this.workingSelection.length > 0) {
                await this.placeBombs();
            } else {
                logger.info("There are no heroes to work now.");
                logger.info("Will sleep for 2 minutes");
                await this.adventure();
                await sleep(120000);
            }

            logger.info("Closing map...");
            await this.client.stopPVE();
        } while (this.shouldRun);
    }

    private resetState() {
        this.history = [];
        this.explosionByHero = new Map();
        this.selection = [];
        this.index = 0;
    }

    reset() {
        this.client.wipe();

        this.client.on({
            event: "getBlockMap",
            handler: this.handleMapLoad.bind(this),
        });

        this.client.on({
            event: "syncBomberman",
            handler: this.handleSquadLoad.bind(this),
        });

        this.client.on({
            event: "goSleep",
            handler: this.handleHeroSleep.bind(this),
        });

        this.client.on({
            event: "goWork",
            handler: this.handleHeroWork.bind(this),
        });

        this.client.on({
            event: "startExplode",
            handler: this.handleExplosion.bind(this),
        });

        this.resetState();
    }

    private handleMapLoad(payload: IGetBlockMapPayload[]) {
        const blocks = payload.map(parseGetBlockMapPayload).map(buildBlock);
        this.map.update({ blocks });
    }

    private handleSquadLoad(payload: ISyncBombermanPayload[]) {
        const heroes = payload.map(parseSyncBombermanPayload).map(buildHero);
        this.squad.update({ heroes });
    }

    private handleHeroSleep(params: IHeroUpdateParams) {
        this.squad.updateHeroEnergy(params);
        this.squad.updateHeroState(params.id, "Sleep");
    }

    private handleHeroWork(params: IHeroUpdateParams) {
        this.squad.updateHeroEnergy(params);
        this.squad.updateHeroState(params.id, "Work");
    }

    private handleExplosion(payload: IStartExplodePayload) {
        const [mapParams, heroParams] = parseStartExplodePayload(payload);
        this.squad.updateHeroEnergy(heroParams);
        mapParams.forEach((params) => this.map.updateBlock(params));
    }
}
