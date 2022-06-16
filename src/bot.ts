import { Context, Telegraf } from "telegraf";
import { Client } from "./api";
import { getRandomArbitrary, sleep } from "./lib";
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
    IEnemies,
    IEnemyTakeDamagePayload,
    IGetActiveBomberPayload,
    isFloat,
    IStartExplodePayload,
    IStartStoryExplodePayload,
    ISyncBombermanPayload,
    parseGetActiveBomberPayload,
    parseGetBlockMapPayload,
    parseStartExplodePayload,
    parseSyncHousePayload,
} from "./parsers";
import { ILoginParams } from "./parsers/login";

const DEFAULT_TIMEOUT = 120000;
const HISTORY_SIZE = 5;
const ADVENTURE_ENABLED = true;

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
    modeAmazon?: boolean;
    modeAdventure?: boolean;
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
    private modeAmazon = false;
    private modeAdventure = false;
    private adventureBlocks: IGetBlockMapPayload[] = [];
    private adventureEnemies: IEnemies[] = [];

    constructor(loginParams: ILoginParams, moreParams: IMoreOptions) {
        const {
            forceExit = true,
            minHeroEnergyPercentage = 90,
            telegramKey,
            modeAmazon = false,
            modeAdventure = false,
        } = moreParams;

        this.modeAdventure = modeAdventure;
        this.modeAmazon = modeAmazon;
        this.client = new Client(loginParams, DEFAULT_TIMEOUT, modeAmazon);
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
        const formatMsg = (hero: Hero) => {
            const shield = hero.shields?.length
                ? `${hero.shields[0].current}/${hero.shields[0].total}`
                : "empty shield";
            return `${hero.rarity} [${hero.id}]: ${hero.energy}/${hero.maxEnergy} | ${shield}`;
        };

        const workingHeroesLife = this.workingSelection
            .map(formatMsg)
            .join("\n");
        const notWorkingHeroesLife = this.notWorkingSelection
            .map(formatMsg)
            .join("\n");

        const message =
            `Map: ${this.map.toString()}\n` +
            `IDX: ${this.index}\n\n` +
            `INFO: LIFE HERO | SHIELD HERO\n\n` +
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
        if (this.client.isLoggedIn) return;
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
        const location = this.map
            .getHeroDamageForMap(hero)
            .find(
                ({ tile }) =>
                    tile.i == result?.tile.i && tile.j == result?.tile.j
            );

        if (result && location && location.damage > 0) {
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
            selected = items[0];
            //random
            //selected = items[Math.floor(Math.random() * items.length)];
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

        const timedelta = (distance / hero.speed) * 1000;
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
        const method = this.modeAmazon ? "startExplodeV2" : "startExplode";
        const result = await this.client[method]({
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

    async getHeroAdventure(allHeroes: ISyncBombermanPayload[]) {
        const details = await this.client.getStoryDetails();
        const usedHeroes = details.played_bombers.map((hero) => hero.id);
        const hero = allHeroes.find((hero) => !usedHeroes.includes(hero.id));

        return hero;
    }

    getBlockAdventure() {
        const items = this.adventureBlocks;
        return items[Math.floor(Math.random() * items.length)];
    }
    getEnemyAdventure() {
        const items = this.adventureEnemies.filter((enemy) => enemy.hp > 0);
        return items[Math.floor(Math.random() * items.length)];
    }

    async placebombAdventure(
        hero: ISyncBombermanPayload,
        block: IGetBlockMapPayload | { i: number; j: number },
        enemy?: IEnemies
    ) {
        const i = block ? block.i : Math.ceil(getRandomArbitrary(1, 10));
        const j = block ? block.j : Math.ceil(getRandomArbitrary(1, 10));
        logger.info(`${hero.id} will place bomb on (${i}, ${j})`);
        const startExplode = this.client.startStoryExplode({
            heroId: hero.id,
            i: i,
            j: j,
            blocks: [],
            bombId: 0,
            isHero: true,
        });

        if (enemy) {
            const totalEnemies = this.adventureEnemies.filter(
                (enemy) => enemy.hp > 0
            );
            logger.info(
                `${hero.id} will place bomb in enemy ${enemy.id} ${enemy.hp}/${enemy.maxHp} totalEnemies ${totalEnemies.length}`
            );
            const enemyTakeDamage = this.client.enemyTakeDamage({
                enemyId: enemy.id,
                heroId: hero.id,
            });
            return await Promise.all([startExplode, enemyTakeDamage]);
        }

        return await startExplode;
    }

    async placeBombsAdventure(hero: ISyncBombermanPayload) {
        let enemy;
        while ((enemy = this.getEnemyAdventure())) {
            const block = this.getBlockAdventure();

            await this.placebombAdventure(hero, block, enemy);

            await sleep(getRandomArbitrary(4, 9) * 1000);
        }
        return true;
    }

    async adventure() {
        if (!ADVENTURE_ENABLED) return null;
        const allHeroes = await this.client.syncBomberman();

        if (allHeroes.length < 15) return null;

        const rewards = await this.client.getReward();
        const keys = rewards.filter((reward) => reward.type === "Key")[0];

        logger.info(`Adventure mode iteration`);

        if (!keys || keys.value === 0) {
            logger.info(`No keys to play right now.`);
            return;
        }
        logger.info(`${keys.value} keys mode adventure`);

        const details = await this.client.getStoryDetails();
        const hero = await this.getHeroAdventure(allHeroes);

        if (hero) {
            const level = Math.min(details.max_level + 1, 45);

            logger.info(`Will play level ${level} with hero ${hero.id}`);

            const result = await this.client.getStoryMap(hero.id, level);
            this.adventureBlocks = result.positions;
            this.adventureEnemies = result.enemies;
            logger.info(`Total enemies: ${this.adventureEnemies.length}`);

            await this.placeBombsAdventure(hero);
            logger.info(
                `Place bomb in door x:${result.door_x} y:${result.door_y}`
            );
            await this.placebombAdventure(hero, {
                i: result.door_x,
                j: result.door_y,
            }); //placebomb door

            logger.info(
                `total enemies after door: ${
                    this.adventureEnemies.filter((enemy) => enemy.hp > 0).length
                }`
            );
            await this.placeBombsAdventure(hero); //verifica se tem mais enimies

            logger.info(`Enter door adventure mode`);
            const resultDoor = await this.client.enterDoor();

            logger.info(`Finished Adventure mode ${resultDoor.rewards} Bcoin`);
        } else {
            logger.info(`No hero Adventure mode`);
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

            logger.info("Opening map...");
            await this.client.startPVE(0, this.modeAmazon);

            if (this.workingSelection.length > 0) {
                await this.placeBombs();
            }
            logger.info("Closing map...");
            await this.client.stopPVE();

            logger.info("There are no heroes to work now.");
            logger.info("Will sleep for 2 minutes");

            if (
                (Date.now() > this.lastAdventure + 10 * 60 * 1000 ||
                    this.lastAdventure === 0) &&
                this.modeAdventure
            ) {
                this.resetStateAdventure();

                await this.adventure();
                this.lastAdventure = Date.now();
            }
            await sleep(120000);
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
    private resetStateAdventure() {
        this.adventureBlocks = [];
        this.adventureEnemies = [];
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
        this.client.on({
            event: "startExplodeV2",
            handler: this.handleExplosion.bind(this),
        });
        this.client.on({
            event: "startStoryExplode",
            handler: this.handleStartStoryExplode.bind(this),
        });
        this.client.on({
            event: "enemyTakeDamage",
            handler: this.handleEnemyTakeDamage.bind(this),
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
    private handleStartStoryExplode(payload: IStartStoryExplodePayload) {
        if (payload.blocks.length) {
            //remove blocks from this.adventureblocks
            payload.blocks.forEach((block) => {
                this.adventureBlocks = this.adventureBlocks.filter(
                    (b) => b.i !== block.i || b.j !== block.j
                );
            });

            // payload.blocks.forEach((block) => {
            //     const blockExists = this.adventureBlocks.find(
            //         (b) => block.i == b.i && block.j == b.j
            //     );
            //     if (blockExists) {
            //         blockExists.hp = 0;
            //     }
            // });
        }
        if (payload.enemies && payload.enemies.length) {
            logger.info(`add enemies ${payload.enemies.length}`);
            payload.enemies.forEach((enemy) => {
                this.adventureEnemies.push(enemy);
            });
        }
    }
    private handleEnemyTakeDamage(payload: IEnemyTakeDamagePayload) {
        const enemy = this.adventureEnemies.find(
            (enemy) => enemy.id == payload.id
        );
        if (enemy) {
            enemy.hp = payload.hp;
        }
    }
}
