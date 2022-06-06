import {
    LoggerEvent,
    LogLevel,
    LogoutRequest,
    SFSEvent,
    SFSObject,
    SmartFox,
} from "sfs2x-api";
import got from "got";
import UserAgent from "user-agents";
import { HOST, PORT, ZONE } from "../constants";
import { makeException } from "../err";
import { askAndParseEnv, parseBoolean } from "../lib";
import { logger } from "../logger";
import { IGetBlockMapPayload, IHeroUpdateParams } from "../model";
import { IStoryDetailsPayload, ISyncHousePayload } from "../parsers";
import { IStartExplodeInput, IStartExplodePayload } from "../parsers/explosion";
import {
    IGetActiveBomberPayload,
    ISyncBombermanPayload,
} from "../parsers/hero";
import { ILoginParams } from "../parsers/login";
import {
    IGetRewardPayload,
    parseRewardType,
    ICoinDetailPayload,
} from "../parsers/reward";
import { EGameAction } from "./base";
import {
    ISerializedRequestController,
    IUniqueRequestController,
    makeSerializedPromise,
    makeUniquePromise,
    rejectSerializedPromise,
    rejectUniquePromise,
    resolveSerializedPromise,
    resolveUniquePromise,
} from "./promise";
import {
    makeClaimRequest,
    makeCoinDetailRequest,
    makeEnterDoorRequest,
    makeGetActiveBomberRequest,
    makeGetBlockMapRequest,
    makeGetHeroUpgradePowerRequest,
    makeGetRewardRequest,
    makeGetStoryLevelDetail,
    makeGetStoryMap,
    makeGoHomeRequest,
    makeGoSleepRequest,
    makeGoWorkRequest,
    makeLoginRequest,
    makeStartExplodeRequest,
    makeStartExplodeV2Request,
    makeStartPVERequest,
    makeStopPVERequest,
    makeSyncBombermanRequest,
    makeSyncHouseRequest,
} from "./requests";

type IExtensionResponseParams = {
    cmd: EGameAction;
    params: SFSObject;
};

type ILoginErrorParams = {
    errorCode: number;
};

type IConnectionParams = {
    success: boolean;
};

type EventHandlerMap = {
    connection: () => void;
    connectionFailed: () => void;
    connectionLost: () => void;
    login: () => void;
    loginError: (errorCode: number) => void;
    logout: () => void;
    getHeroUpgradePower: () => void;
    getBlockMap: (blocks: IGetBlockMapPayload[]) => void;
    syncHouse: (houses: ISyncHousePayload[]) => void;
    getActiveBomber: (heroes: IGetActiveBomberPayload[]) => void;
    syncBomberman: (heroes: ISyncBombermanPayload[]) => void;
    claim: () => void;
    startPVE: () => void;
    stopPVE: () => void;
    startExplode: (payload: IStartExplodePayload) => void;
    startExplodeV2: (payload: IStartExplodePayload) => void;
    goSleep: (payload: IHeroUpdateParams) => void;
    goHome: (payload: IHeroUpdateParams) => void;
    goWork: (payload: IHeroUpdateParams) => void;
    getReward: (payload: IGetRewardPayload[]) => void;
    coinDetail: (payload: ICoinDetailPayload) => void;
    getStoryDetails: (payload: IStoryDetailsPayload) => void;
    getStoryMap: () => void;
    enterDoor: () => void;
    messageError: (command: EGameAction, errorCode: number) => void;
};

type IClientHandlers = {
    [K in keyof EventHandlerMap]: EventHandlerMap[K][];
};

type IEventHandler<T extends keyof EventHandlerMap> = {
    [K in T]: {
        event: K;
        handler: EventHandlerMap[K];
    };
}[T];

type IClientController = {
    connect: IUniqueRequestController<void>;
    disconnect: IUniqueRequestController<void>;
    login: IUniqueRequestController<void>;
    getHeroUpgradePower: IUniqueRequestController<void>;
    logout: IUniqueRequestController<void>;
    getBlockMap: IUniqueRequestController<IGetBlockMapPayload[]>;
    syncHouse: IUniqueRequestController<ISyncHousePayload[]>;
    getActiveHeroes: IUniqueRequestController<IGetActiveBomberPayload[]>;
    syncBomberman: IUniqueRequestController<ISyncBombermanPayload[]>;
    startPVE: IUniqueRequestController<void>;
    claim: IUniqueRequestController<void>;
    stopPVE: IUniqueRequestController<void>;
    startExplode: ISerializedRequestController<IStartExplodePayload>;
    startExplodeV2: ISerializedRequestController<IStartExplodePayload>;
    goSleep: ISerializedRequestController<IHeroUpdateParams>;
    goHome: ISerializedRequestController<IHeroUpdateParams>;
    getReward: IUniqueRequestController<IGetRewardPayload[]>;
    coinDetail: IUniqueRequestController<ICoinDetailPayload>;
    goWork: ISerializedRequestController<IHeroUpdateParams>;
    getStoryMap: IUniqueRequestController<void>;
    getStoryDetails: IUniqueRequestController<IStoryDetailsPayload>;
    enterDoor: IUniqueRequestController<void>;
};

// const userAgent = new UserAgent();

// const API_BASE_HEADERS = {
//     origin: "https://app.bombcrypto.io",
//     referer: "https://app.bombcrypto.io",
//     "sec-ch-ua": ` " Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"`,
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": `"Windows"`,
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "same-site",
//     "user-agent": userAgent.toString()
// };

export class Client {
    private handlers!: IClientHandlers;
    private controller!: IClientController;
    private messageId!: number;
    private timeout: number;
    private sfs: SmartFox;
    private loginParams: ILoginParams;
    private apiBaseHeaders;
    private modeAmazon = false;

    constructor(loginParams: ILoginParams, timeout = 0, modeAmazon = false) {
        this.modeAmazon = modeAmazon;
        const userAgent = new UserAgent();
        this.apiBaseHeaders = {
            origin: "https://app.bombcrypto.io",
            referer: "https://app.bombcrypto.io",
            "sec-ch-ua": ` " Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"`,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": `"Windows"`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent": userAgent.toString(),
        };
        this.sfs = new SmartFox({
            host: HOST,
            port: PORT,
            zone: ZONE,
            debug: askAndParseEnv("DEBUG", parseBoolean, false),
            useSSL: true,
        });
        this.timeout = timeout;
        this.loginParams = loginParams;
        this.wipe();

        this.sfs.setClientDetails("Unity WebGL", "");
        this.connectEvents();
    }

    get walletId() {
        return this.loginParams.type === "wallet"
            ? this.loginParams.wallet
            : this.loginParams.username;
    }

    get isConnected() {
        return this.sfs.isConnected;
    }

    get isLoggedIn() {
        return this.sfs.mySelf !== null;
    }

    on<T extends keyof EventHandlerMap>({ event, handler }: IEventHandler<T>) {
        const selected = this.handlers[event] as IEventHandler<T>["handler"][];
        return this.pushHandler(selected, handler);
    }

    async connect(timeout = 0) {
        if (this.isConnected) return;

        return await makeUniquePromise(
            this.controller.connect,
            () => this.sfs.connect(),
            timeout || this.timeout
        );
    }

    async disconnect(timeout = 0) {
        if (!this.isConnected) return;

        const result = await makeUniquePromise(
            this.controller.disconnect,
            () => this.sfs.disconnect(),
            timeout || this.timeout
        );

        return result;
    }

    async removeAllPromises() {
        Object.values(this.controller).map((value) => {
            value.current?.reject(new Error("Canceled"));
        });
    }

    async login(timeout = 0) {
        if (this.isLoggedIn) return this.walletId;

        let message = "";

        if (this.loginParams.type === "wallet") {
            const data = await got
                .get("https://api.bombcrypto.io/auth/token", {
                    searchParams: {
                        address: this.loginParams.wallet,
                    },
                    headers: this.apiBaseHeaders,
                    http2: true,
                })
                .json<{ message: string }>();

            message = data.message;
        }

        console.log(
            "🚀 ~ file: client.ts ~ line 229 ~ Client ~ login ~ message",
            message
        );

        await this.connect();
        return await makeUniquePromise(
            this.controller.login,
            () => this.sfs.send(makeLoginRequest(this.loginParams, message)),
            timeout || this.timeout
        );
    }

    async logout(timeout = 0) {
        if (!this.isLoggedIn) return;

        return await makeUniquePromise(
            this.controller.logout,
            () => this.sfs.send(new LogoutRequest()),
            timeout || this.timeout
        );
    }

    getHeroUpgradePower(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.getHeroUpgradePower,
            () => {
                const request = makeGetHeroUpgradePowerRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    getBlockMap(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.getBlockMap,
            () => {
                const request = makeGetBlockMapRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    syncHouse(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.syncHouse,
            () => {
                const request = makeSyncHouseRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    getActiveHeroes(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.getActiveHeroes,
            () => {
                const request = makeGetActiveBomberRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    syncBomberman(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.syncBomberman,
            () => {
                const request = makeSyncBombermanRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    startExplode(input: IStartExplodeInput, timeout = 0) {
        this.ensureLoggedIn();

        return makeSerializedPromise(
            this.controller.startExplode,
            () => {
                const request = makeStartExplodeRequest(
                    this.walletId,
                    this.nextId(),
                    input
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }
    startExplodeV2(input: IStartExplodeInput, timeout = 0) {
        this.ensureLoggedIn();

        return makeSerializedPromise(
            this.controller.startExplodeV2,
            () => {
                const request = makeStartExplodeV2Request(
                    this.walletId,
                    this.nextId(),
                    input
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    startPVE(timeout = 0, modeAmazon: boolean) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.startPVE,
            () => {
                const request = makeStartPVERequest(
                    this.walletId,
                    this.nextId(),
                    modeAmazon
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    claim(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.claim,
            () => {
                const request = makeClaimRequest(this.walletId, this.nextId());
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    stopPVE(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.stopPVE,
            () => {
                const request = makeStopPVERequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    goSleep(heroId: number, timeout = 0) {
        this.ensureLoggedIn();

        return makeSerializedPromise(
            this.controller.goSleep,
            () => {
                const request = makeGoSleepRequest(
                    this.walletId,
                    this.nextId(),
                    heroId
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    goHome(heroId: number, timeout = 0) {
        this.ensureLoggedIn();

        return makeSerializedPromise(
            this.controller.goHome,
            () => {
                const request = makeGoHomeRequest(
                    this.walletId,
                    this.nextId(),
                    heroId
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    goWork(heroId: number, timeout = 0) {
        this.ensureLoggedIn();

        return makeSerializedPromise(
            this.controller.goWork,
            () => {
                const request = makeGoWorkRequest(
                    this.walletId,
                    this.nextId(),
                    heroId
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    getReward(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.getReward,
            () => {
                const request = makeGetRewardRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    coinDetail(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.coinDetail,
            () => {
                const request = makeCoinDetailRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    getStoryDetails(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.getStoryDetails,
            () => {
                const request = makeGetStoryLevelDetail(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    getStoryMap(heroId: number, level: number, timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.getStoryMap,
            () => {
                const request = makeGetStoryMap(
                    this.walletId,
                    this.nextId(),
                    heroId,
                    level
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    enterDoor(timeout = 0) {
        this.ensureLoggedIn();

        return makeUniquePromise(
            this.controller.enterDoor,
            () => {
                const request = makeEnterDoorRequest(
                    this.walletId,
                    this.nextId()
                );
                this.sfs.send(request);
            },
            timeout || this.timeout
        );
    }

    wipe() {
        if (this.isConnected) this.sfs.disconnect();

        this.handlers = {
            connection: [],
            connectionFailed: [],
            connectionLost: [],
            login: [],
            loginError: [],
            logout: [],
            getHeroUpgradePower: [],
            getBlockMap: [],
            syncHouse: [],
            getActiveBomber: [],
            syncBomberman: [],
            claim: [],
            startPVE: [],
            stopPVE: [],
            startExplode: [],
            startExplodeV2: [],
            goSleep: [],
            goHome: [],
            goWork: [],
            getReward: [],
            coinDetail: [],
            getStoryDetails: [],
            getStoryMap: [],
            enterDoor: [],
            messageError: [],
        };

        this.controller = {
            connect: {
                current: undefined,
            },
            disconnect: {
                current: undefined,
            },
            login: {
                current: undefined,
            },
            logout: {
                current: undefined,
            },
            getHeroUpgradePower: {
                current: undefined,
            },
            getBlockMap: {
                current: undefined,
            },
            syncHouse: {
                current: undefined,
            },
            getActiveHeroes: {
                current: undefined,
            },
            syncBomberman: {
                current: undefined,
            },
            claim: {
                current: undefined,
            },
            startPVE: {
                current: undefined,
            },
            stopPVE: {
                current: undefined,
            },
            startExplode: {
                current: undefined,
                executors: [],
            },
            startExplodeV2: {
                current: undefined,
                executors: [],
            },
            goWork: {
                current: undefined,
                executors: [],
            },
            goSleep: {
                current: undefined,
                executors: [],
            },
            goHome: {
                current: undefined,
                executors: [],
            },
            getReward: {
                current: undefined,
            },
            coinDetail: {
                current: undefined,
            },
            getStoryDetails: {
                current: undefined,
            },
            getStoryMap: {
                current: undefined,
            },
            enterDoor: {
                current: undefined,
            },
        };

        this.messageId = 0;
    }

    private ensureLoggedIn() {
        if (!this.isLoggedIn) throw makeException("WrongUsage", "Log in first");
    }

    private nextId() {
        return this.messageId++;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private pushHandler<T extends (...args: any[]) => void>(
        handlers: T[],
        handler: T
    ) {
        handlers.push(handler);
        return () => handlers.splice(handlers.indexOf(handler), 1);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private callHandler<T extends (...args: any[]) => void>(
        handlers: T[],
        ...params: Parameters<T>
    ) {
        handlers.forEach((handler) => handler(...params));
    }

    private handleConnection(params: IConnectionParams) {
        if (params.success) {
            this.callHandler(this.handlers.connection);
            resolveUniquePromise(this.controller.connect, undefined);
        } else {
            this.callHandler(this.handlers.connectionFailed);
            rejectUniquePromise(
                this.controller.connect,
                makeException("ConnectionFailed", "Connection failed")
            );
        }
    }

    private handleLogin() {
        this.callHandler(this.handlers.login);
    }

    private handleLoginError({ errorCode }: ILoginErrorParams) {
        rejectUniquePromise(
            this.controller.login,
            makeException("LoginFailed", `Error code ${errorCode}`)
        );
        this.callHandler(this.handlers.loginError, errorCode);
    }

    private handleUserLogin() {
        resolveUniquePromise(this.controller.login, undefined);
    }

    private handleLogout() {
        resolveUniquePromise(this.controller.logout, undefined);
        this.callHandler(this.handlers.logout);
    }

    private handleGetHeroUpgradePower() {
        resolveUniquePromise(this.controller.getHeroUpgradePower, undefined);
        this.callHandler(this.handlers.getHeroUpgradePower);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handleConnectionLost() {
        resolveUniquePromise(this.controller.disconnect, undefined);
        this.callHandler(this.handlers.connectionLost);
    }

    private handleGetBlockMap(params: SFSObject) {
        const data = params.getUtfString(
            this.modeAmazon ? "datas_pve_v2" : "datas_pve"
        );
        const blocks = JSON.parse(data) as IGetBlockMapPayload[];
        resolveUniquePromise(this.controller.getBlockMap, blocks);
        this.callHandler(this.handlers.getBlockMap, blocks);
    }

    private handleSyncBomberman(params: SFSObject) {
        const data = params.getSFSArray("bombers");
        const bombers = Array(data.size())
            .fill(null)
            .map((_, i) => {
                const payload = data.getSFSObject(i);
                return {
                    stage: payload.getInt("stage"),
                    id: payload.getLong("id"),
                    gen_id: payload.getUtfString("gen_id"),
                    energy: payload.getInt("energy"),
                    active: payload.getInt("active"),
                    restore_hp: payload.getInt("restore_hp"),
                };
            });

        resolveUniquePromise(this.controller.syncBomberman, bombers);
        this.callHandler(this.handlers.syncBomberman, bombers);
    }

    private handleGetActiveHeroes(params: SFSObject) {
        const data = params.getSFSArray("bombers");
        const bombers = Array(data.size())
            .fill(null)
            .map((_, i) => {
                const payload = data.getSFSObject(i);
                const dataShields = payload.getSFSArray("shields");
                const shields = Array(dataShields.size());

                return {
                    shields: shields.fill(null).map((_, i) => {
                        const shield = dataShields.getSFSObject(i);
                        return {
                            current: shield.getInt("current"),
                            total: shield.getInt("total"),
                            ability: shield.getInt("ability"),
                        };
                    }),
                    stage: payload.getInt("stage"),
                    id: payload.getLong("id"),
                    gen_id: payload.getUtfString("gen_id"),
                    energy: payload.getInt("energy"),
                } as IGetActiveBomberPayload;
            });

        resolveUniquePromise(this.controller.getActiveHeroes, bombers);
        this.callHandler(this.handlers.getActiveBomber, bombers);
    }

    private handleStartExplode(params: SFSObject) {
        const id = params.getLong("id");
        const data = params.getSFSArray("blocks");
        const blocks = Array(data.size())
            .fill(null)
            .map((_, i) => {
                const payload = data.getSFSObject(i);
                return {
                    hp: payload.getInt("hp"),
                    i: payload.getInt("i"),
                    j: payload.getInt("j"),
                };
            });

        const result = {
            id: id,
            energy: params.getInt("energy"),
            blocks,
        };

        resolveSerializedPromise(this.controller.startExplode, result);
        this.callHandler(this.handlers.startExplode, result);
    }
    private handleStartExplodeV2(params: SFSObject) {
        const id = params.getLong("id");
        const data = params.getSFSArray("blocks");
        const blocks = Array(data.size())
            .fill(null)
            .map((_, i) => {
                const payload = data.getSFSObject(i);
                return {
                    hp: payload.getInt("hp"),
                    i: payload.getInt("i"),
                    j: payload.getInt("j"),
                };
            });

        const result = {
            id: id,
            energy: params.getInt("energy"),
            blocks,
        };

        resolveSerializedPromise(this.controller.startExplodeV2, result);
        this.callHandler(this.handlers.startExplodeV2, result);
    }

    private handleStartPVE() {
        resolveUniquePromise(this.controller.startPVE, undefined);
        this.callHandler(this.handlers.startPVE);
    }

    private handleClaim() {
        resolveUniquePromise(this.controller.claim, undefined);
        this.callHandler(this.handlers.claim);
    }

    private handleStopPVE() {
        resolveUniquePromise(this.controller.stopPVE, undefined);
        this.callHandler(this.handlers.stopPVE);
    }

    private handleGoSleep(params: SFSObject) {
        const id = params.getLong("id");
        const energy = params.getInt("energy");

        const result = { id, energy };

        resolveSerializedPromise(this.controller.goSleep, result);
        this.callHandler(this.handlers.goSleep, result);
    }

    private handleGoHome(params: SFSObject) {
        const id = params.getLong("id");
        const energy = params.getInt("energy");

        const result = { id, energy };

        resolveSerializedPromise(this.controller.goHome, result);
        this.callHandler(this.handlers.goHome, result);
    }

    private handleGoWork(params: SFSObject) {
        const id = params.getLong("id");
        const energy = params.getInt("energy");

        const result = { id, energy };

        resolveSerializedPromise(this.controller.goWork, result);
        this.callHandler(this.handlers.goWork, result);
    }

    private handleGetReward(params: SFSObject) {
        const rawRewards = params.getSFSArray("rewards");

        const rewards = Array(rawRewards.size())
            .fill(null)
            .map((_, i) => {
                const reward = rawRewards.getSFSObject(i);

                return {
                    remainTime: reward.getInt("remain_time"),
                    type: parseRewardType(reward.getUtfString("type")),
                    value: reward.getFloat("value"),
                };
            });
        console.log(
            "🚀 ~ file: client.ts ~ line 806 ~ Client ~ handleGetReward ~ rewards",
            rewards
        );

        resolveUniquePromise(this.controller.getReward, rewards);
        this.callHandler(this.handlers.getReward, rewards);
    }

    private handleCoinDetail(params: SFSObject) {
        const detail = {
            mined: params.getFloat("mined"),
            invested: params.getFloat("invested"),
            rewards: params.getFloat("rewards"),
        };

        resolveUniquePromise(this.controller.coinDetail, detail);
        this.callHandler(this.handlers.coinDetail, detail);
    }

    private handleGetStoryDetails(params: SFSObject) {
        const rawRewards = params.getSFSArray("level_rewards");

        const rewards = Array(rawRewards.size())
            .fill(null)
            .map((_, i) => {
                const reward = rawRewards.getSFSObject(i);

                return {
                    rare: reward.getInt("rare"),
                    replay: reward.getFloat("replay"),
                    first_win: reward.getFloat("first_win"),
                };
            });

        const rawPlayedBombers = params.getSFSArray("played_bombers");

        const playedBombers = Array(rawPlayedBombers.size())
            .fill(null)
            .map((_, i) => {
                const playedBomber = rawPlayedBombers.getSFSObject(i);

                return {
                    remaining_time: playedBomber.getLong("remaining_time"),
                    id: playedBomber.getLong("id"),
                };
            });

        const result = {
            level_rewards: rewards,
            played_bombers: playedBombers,
            is_new: params.getBool("is_new"),
            max_level: params.getInt("max_level"),
            current_level: params.getInt("current_level"),
            hero_id: params.getLong("hero_id"),
        };

        resolveUniquePromise(this.controller.getStoryDetails, result);
        this.callHandler(this.handlers.getStoryDetails, result);
    }

    private handleGetStoryMap() {
        resolveUniquePromise(this.controller.getStoryMap, undefined);
        this.callHandler(this.handlers.getStoryMap);
    }

    private handleSyncHouse(params: SFSObject) {
        const data = params.getSFSArray("houses");

        const houses = Array(data.size())
            .fill(null)
            .map((_, i) => {
                const payload = data.getSFSObject(i);
                return {
                    house_gen_id: payload.getUtfString("house_gen_id"),
                    active: payload.getInt("active"),
                };
            });

        resolveUniquePromise(this.controller.syncHouse, houses);
        this.callHandler(this.handlers.syncHouse, houses);
    }

    private handleEnterDoor() {
        resolveUniquePromise(this.controller.enterDoor, undefined);
        this.callHandler(this.handlers.enterDoor);
    }

    private handleMessageError(command: EGameAction, errorCode: number) {
        this.callHandler(this.handlers.messageError, command, errorCode);

        const error = makeException(
            "MessageError",
            `Failed with code ${errorCode}`
        );

        switch (command) {
            case "GET_BLOCK_MAP":
                return rejectUniquePromise(this.controller.getBlockMap, error);

            case "SYNC_HOUSE":
                return rejectUniquePromise(this.controller.syncHouse, error);

            case "GET_ACTIVE_BOMBER":
                return rejectUniquePromise(
                    this.controller.getActiveHeroes,
                    error
                );

            case "SYNC_BOMBERMAN":
                return rejectUniquePromise(
                    this.controller.syncBomberman,
                    error
                );

            case "START_EXPLODE":
                resolveUniquePromise(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.controller.startExplode as any,
                    undefined
                );
                break;
            case "START_EXPLODE_V2":
                resolveUniquePromise(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.controller.startExplodeV2 as any,
                    undefined
                );
                break;

            case "USER_LOGIN":
                return rejectUniquePromise(this.controller.login, error);

            case "START_PVE":
                return rejectUniquePromise(this.controller.startPVE, error);

            case "APPROVE_CLAIM":
                return rejectUniquePromise(this.controller.claim, error);

            case "STOP_PVE":
                return rejectUniquePromise(this.controller.stopPVE, error);

            case "GO_SLEEP":
                return rejectSerializedPromise(this.controller.goSleep, error);

            case "GO_HOME":
                return rejectSerializedPromise(this.controller.goHome, error);

            case "GO_WORK":
                return rejectSerializedPromise(this.controller.goWork, error);

            case "GET_REWARD":
                return rejectUniquePromise(this.controller.getReward, error);

            case "COIN_DETAIL":
                return rejectUniquePromise(this.controller.coinDetail, error);

            case "GET_HERO_UPGRADE_POWER":
                return rejectUniquePromise(
                    this.controller.getHeroUpgradePower,
                    error
                );

            case "GET_STORY_LEVEL_DETAIL":
                return rejectUniquePromise(
                    this.controller.getStoryDetails,
                    error
                );

            case "GET_STORY_MAP":
                return rejectUniquePromise(this.controller.getStoryMap, error);

            case "ENTER_DOOR":
                return rejectUniquePromise(this.controller.enterDoor, error);
        }
    }

    private connectEvents() {
        this.sfs.addEventListener(
            SFSEvent.EXTENSION_RESPONSE,
            this.handleExtentionResponse,
            this
        );

        this.sfs.addEventListener(SFSEvent.LOGIN, this.handleLogin, this);
        this.sfs.addEventListener(
            SFSEvent.LOGIN_ERROR,
            this.handleLoginError,
            this
        );
        this.sfs.addEventListener(SFSEvent.LOGOUT, this.handleLogout, this);

        this.sfs.addEventListener(
            SFSEvent.CONNECTION,
            this.handleConnection,
            this
        );
        this.sfs.addEventListener(
            SFSEvent.CONNECTION_LOST,
            this.handleConnectionLost,
            this
        );

        if (askAndParseEnv("DEBUG", parseBoolean, false)) {
            this.sfs.logger.level = LogLevel.DEBUG;
            this.sfs.logger.enableConsoleOutput = true;
            this.sfs.logger.enableEventDispatching = true;

            this.sfs.logger.addEventListener(
                LoggerEvent.INFO,
                logger.info,
                logger
            );
            this.sfs.logger.addEventListener(
                LoggerEvent.ERROR,
                logger.error,
                logger
            );
            this.sfs.logger.addEventListener(
                LoggerEvent.WARNING,
                logger.warning,
                logger
            );
            this.sfs.logger.addEventListener(
                LoggerEvent.DEBUG,
                logger.debug,
                logger
            );
        }
    }

    private handleExtentionResponse(response: IExtensionResponseParams) {
        const params = response.params;

        const ec = params.getInt("ec");
        if (ec !== 0) return this.handleMessageError(response.cmd, ec);

        switch (response.cmd) {
            case "GET_BLOCK_MAP":
                return this.handleGetBlockMap(response.params);

            case "SYNC_HOUSE":
                return this.handleSyncHouse(response.params);

            case "GET_ACTIVE_BOMBER":
                return this.handleGetActiveHeroes(response.params);

            case "SYNC_BOMBERMAN":
                return this.handleSyncBomberman(response.params);

            case "START_EXPLODE":
                return this.handleStartExplode(response.params);

            case "START_EXPLODE_V2":
                return this.handleStartExplodeV2(response.params);

            case "START_PVE":
                return this.handleStartPVE();

            case "APPROVE_CLAIM":
                return this.handleClaim();

            case "STOP_PVE":
                return this.handleStopPVE();

            case "GO_SLEEP":
                return this.handleGoSleep(response.params);

            case "GO_WORK":
                return this.handleGoWork(response.params);

            case "GO_HOME":
                return this.handleGoHome(response.params);

            case "USER_LOGIN":
                return this.handleUserLogin();

            case "GET_REWARD":
                return this.handleGetReward(response.params);

            case "COIN_DETAIL":
                return this.handleCoinDetail(response.params);

            case "GET_HERO_UPGRADE_POWER":
                return this.handleGetHeroUpgradePower();

            case "GET_STORY_LEVEL_DETAIL":
                return this.handleGetStoryDetails(response.params);

            case "GET_STORY_MAP":
                return this.handleGetStoryMap();

            case "ENTER_DOOR":
                return this.handleEnterDoor();
        }

        console.warn("Unmapped command: ", response);
    }
}
