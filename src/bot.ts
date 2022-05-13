import { Context, Telegraf } from "telegraf";
import { Client } from "./api";
import { askAndParseEnv, parseBoolean, sleep } from "./lib";
import { logger } from "./logger";
import {
    buildBlock,
    buildHero,
    buildHouse,
    Hero,
    House,
    IGetBlockMapPayload,
    IHeroUpdateParams,
    IMapTile,
    IMapTileEmpty,
    Squad,
    TreasureMap,
} from "./model";
import {
    IGetActiveBomberPayload,
    isFloat,
    IStartExplodePayload,
    parseGetActiveBomberPayload,
    parseGetBlockMapPayload,
    parseStartExplodePayload,
    parseSyncHousePayload,
} from "./parsers";
import { ILoginParams } from "./parsers/login";

const DEFAULT_TIMEOUT = 120000;
const HISTORY_SIZE = 5;
const ADVENTURE_ENABLED = false;

type ExplosionByHero = Map<
    number,
    {
        timestamp: number;
        tile: IMapTile;
    }
>;
type LocationByHeroWorking = Map<
    number,
    {
        damage: number;
        tile: IMapTileEmpty;
    }
>;
type HeroBombs = { lastId: number; ids: number[] };

interface IMoreOptions {
    telegramKey?: string;
    forceExit?: boolean;
    minHeroEnergyPercentage?: number;
}

const TELEGRAF_COMMANDS = ["rewards", "exit", "stats"] as const;

type ETelegrafCommand = typeof TELEGRAF_COMMANDS[number];

export class TreasureMapBot {
    public client!: Client;
    public map!: TreasureMap;
    private squad!: Squad;
    private telegraf?: Telegraf;
    private selection: Hero[];
    private houses: House[];
    private explosionByHero: ExplosionByHero;
    private locationByHeroWorking: LocationByHeroWorking;
    private heroBombs: Record<number, HeroBombs> = {};
    private history: IMapTile[];
    private index: number;
    private shouldRun: boolean;
    private lastAdventure: number;
    private forceExit = true;
    private minHeroEnergyPercentage;

    constructor(loginParams: ILoginParams, moreParams: IMoreOptions) {
        const {
            forceExit = true,
            minHeroEnergyPercentage = 90,
            telegramKey,
        } = moreParams;

        this.client = new Client(loginParams, DEFAULT_TIMEOUT);
        this.map = new TreasureMap({ blocks: [] });
        this.squad = new Squad({ heroes: [] });
        this.houses = [];
        this.forceExit = forceExit || true;
        this.minHeroEnergyPercentage = minHeroEnergyPercentage;

        this.explosionByHero = new Map();
        this.heroBombs = {};
        this.locationByHeroWorking = new Map();
        this.selection = [];
        this.history = [];
        this.index = 0;
        this.shouldRun = false;
        this.lastAdventure = 0;

        if (telegramKey) this.initTelegraf(telegramKey);
        this.reset();
    }

    async stop() {
        logger.info("Send sleeping heros...");
        this.shouldRun = false;

        await sleep(5000);

        for (const hero of this.workingSelection) {
            await this.client.goSleep(hero.id);
        }

        if (this.telegraf) {
            this.telegraf.stop();
        }
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

    public async getStatsAccount() {
        const formatMsg = (hero: Hero) =>
            `${hero.rarity} [${hero.id}]: ${hero.energy}/${hero.maxEnergy}`;

        const workingHeroesLife = this.workingSelection
            .map(formatMsg)
            .join("\n");
        const notWorkingHeroesLife = this.notWorkingSelection
            .map(formatMsg)
            .join("\n");

        const message =
            `Map: ${this.map.toString()}\n` +
            `IDX: ${this.index}\n\n` +
            `Working heroes (${this.workingSelection.length}): \n${workingHeroesLife}\n\n` +
            `Resting heroes (${this.notWorkingSelection.length}): \n${notWorkingHeroesLife}`;

        return message;
    }

    public async getRewardAccount() {
        if (this.client.isConnected) {
            const rewards = await this.client.getReward();
            const detail = await this.client.coinDetail();

            const message =
                "Rewards:\n" +
                `Mined: ${detail.mined} | Invested: ${detail.invested} ` +
                `| Rewards: ${detail.rewards}\n` +
                rewards
                    .map(
                        (reward) =>
                            `${reward.type}: ${
                                isFloat(reward.value)
                                    ? reward.value.toFixed(2)
                                    : reward.value
                            }`
                    )
                    .join("\n");

            return message;
        } else {
            throw new Error("Not connected, please wait");
        }
    }

    public async handleTelegraf(command: ETelegrafCommand, context: Context) {
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
            await this.telegraf?.stop();
            await sleep(10000);
            if (this.forceExit) {
                process.exit(0);
            }
        } else if (command === "rewards") {
            try {
                const message = await this.getRewardAccount();
                await context.reply(message);
            } catch (e) {
                await context.reply("Not connected, please wait");
            }
        } else if (command === "stats") {
            const message = await this.getStatsAccount();
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
    get notWorkingSelection() {
        return this.squad.notWorking;
    }

    get home(): House | undefined {
        return this.houses.filter((house) => house.active)[0];
    }

    get homeSlots() {
        return this.home?.slots || 0;
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

    async refreshHeroAtHome() {
        const homeSelection = this.squad.notWorking
            .sort((a, b) => a.energy - b.energy)
            .slice(0, this.homeSlots);

        logger.info(`Will send heroes home (${this.homeSlots} slots)`);

        const atHome = this.squad.byState("Home");

        for (const hero of atHome) {
            if (homeSelection.some((hs) => hs.id === hero.id)) continue;

            logger.info(`Removing hero ${hero.id} from home`);
            await this.client.goSleep(hero.id);
        }
        for (const hero of homeSelection) {
            if (hero.state === "Home") continue;

            logger.info(`Sending hero ${hero.id} home`);
            await this.client.goHome(hero.id);
        }
    }

    async refreshHeroSelection() {
        logger.info("Refreshing heroes");
        await this.client.getActiveHeroes();

        this.selection = this.squad.byState("Work");

        for (const hero of this.squad.notWorking) {
            const percent = (hero.energy / hero.maxEnergy) * 100 * 1.2;
            if (percent < this.minHeroEnergyPercentage) continue;

            logger.info(`Sending hero ${hero.id} to work`);
            await this.client.goWork(hero.id);
            this.selection.push(hero);
        }

        logger.info(`Sent ${this.selection.length} heroes to work`);

        await this.refreshHeroAtHome();
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
        //verifica se ele ja esta jogando a bomba em um local
        const result = this.locationByHeroWorking.get(hero.id);

        if (result) {
            return result;
        }
        const locations = this.map
            .getHeroDamageForMap(hero)
            .filter(({ damage }) => damage > 0);

        let selected;

        if (locations.length <= HISTORY_SIZE) {
            selected = locations[0];
        } else {
            const items = locations.filter(
                ({ tile: option }) =>
                    !this.history.find(
                        (tile) => tile.i === option.i && tile.j === option.j
                    )
            );
            //random
            selected = items[Math.floor(Math.random() * items.length)];
        }
        if (!selected) {
            selected = locations[0];
        }

        this.locationByHeroWorking.set(hero.id, selected);
        return selected;
    }

    canPlaceBomb(hero: Hero, location: IMapTile) {
        const entry = this.explosionByHero.get(hero.id);
        if (!entry) return true;

        const distance =
            Math.abs(location.i - entry.tile.i) +
            Math.abs(location.j - entry.tile.j);

        const timedelta = (distance / hero.speed) * 1000 * 1.2;
        const elapsed = Date.now() - entry.timestamp;

        const bombs = this.heroBombs[hero.id]?.ids.length || 0;
        return elapsed >= timedelta && bombs < hero.capacity;
    }

    removeBombHero(hero: Hero, bombId: number) {
        if (!(hero.id in this.heroBombs)) {
            this.heroBombs[hero.id] = { ids: [], lastId: 0 };
        }

        const bombsByHero = this.heroBombs[hero.id];

        this.heroBombs[hero.id].ids = bombsByHero.ids.filter(
            (b) => b !== bombId
        );
    }

    addBombHero(hero: Hero) {
        if (!(hero.id in this.heroBombs)) {
            this.heroBombs[hero.id] = { ids: [], lastId: 0 };
        }

        const bombsByHero = this.heroBombs[hero.id];

        bombsByHero.lastId++;

        if (bombsByHero.lastId > hero.capacity) {
            bombsByHero.lastId = 1;
        }

        bombsByHero.ids.push(bombsByHero.lastId);
        return bombsByHero;
    }

    async placeBomb(hero: Hero, location: IMapTile) {
        const bombIdObj = this.addBombHero(hero);
        this.locationByHeroWorking.delete(hero.id);
        this.explosionByHero.set(hero.id, {
            timestamp: Date.now(),
            tile: location,
        });

        this.nextLocation(hero);
        if (!bombIdObj) {
            return false;
        }

        const bombId = bombIdObj.lastId;
        //seeta quantas bombas esta jogando ao mesmo tempo

        this.history.push(location);

        logger.info(
            `${hero.rarity} ${hero.id} ${hero.energy}/${hero.maxEnergy} will place ` +
                `bomb on (${location.i}, ${location.j})`
        );
        await sleep(3000);
        const result = await this.client.startExplode({
            heroId: hero.id,
            bombId,
            blocks: [],
            i: location.i,
            j: location.j,
        });


        this.removeBombHero(hero, bombId);



        if (!result) {
            return false;
        }

        const { energy } = result;

        while (this.history.length > HISTORY_SIZE) this.history.shift();

        if (energy <= 0) {
            logger.info(`Sending hero ${hero.id} to sleep`);
            await this.client.goSleep(hero.id);
            await this.refreshHeroAtHome();
            await this.refreshHeroSelection();
        }

        // logger.info(this.map.toString());
    }

    async placeBombsHero(hero: Hero) {
        const location = this.nextLocation(hero);

        if (location && this.canPlaceBomb(hero, location.tile)) {
            await this.placeBomb(hero, location.tile);
        }
    }

    async placeBombs() {
        const running: Record<number, Hero> = {};
        const promises = [];

        while (
            this.map.totalLife > 0 &&
            this.workingSelection.length > 0 &&
            this.shouldRun
        ) {
            for (const hero of this.workingSelection) {
                await sleep(70);

                running[hero.id] = hero;
                const promise = this.placeBombsHero(hero).catch((e) => {
                    throw e;
                });
                promises.push(promise);
            }
        }

        await Promise.all(promises);
    }

    async adventure() {
        if (!ADVENTURE_ENABLED) {
            logger.warn("Adventure mode is deprecated for now.");
            return;
        }

        const shouldRun = askAndParseEnv("ADVENTURE", parseBoolean, false);
        if (!shouldRun) return logger.info("Will not play adventure.");

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

    async loadHouses() {
        const payloads = await this.client.syncHouse();
        this.houses = payloads.map(parseSyncHousePayload).map(buildHouse);
    }

    async loop() {
        this.shouldRun = true;
        await this.logIn();
        await this.loadHouses();
        await this.refreshMap();
        await this.refreshHeroSelection();

        do {
            if (this.map.totalLife <= 0) await this.refreshMap();
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
        this.heroBombs = {};
        this.locationByHeroWorking = new Map();
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
            event: "getActiveBomber",
            handler: this.handleSquadLoad.bind(this),
        });

        this.client.on({
            event: "goSleep",
            handler: this.handleHeroSleep.bind(this),
        });

        this.client.on({
            event: "goHome",
            handler: this.handleHeroHome.bind(this),
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

    private handleSquadLoad(payload: IGetActiveBomberPayload[]) {
        const heroes = payload.map(parseGetActiveBomberPayload).map(buildHero);
        this.squad.update({ heroes });
    }

    private handleHeroSleep(params: IHeroUpdateParams) {
        this.squad.updateHeroEnergy(params);
        this.squad.updateHeroState(params.id, "Sleep");
    }

    private handleHeroHome(params: IHeroUpdateParams) {
        this.squad.updateHeroEnergy(params);
        this.squad.updateHeroState(params.id, "Home");
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
