import {
    ExtensionRequest,
    LoginRequest,
    SFSDataType,
    SFSObject,
} from "sfs2x-api";

import { LC, LT, SALT_KEY, VERSION_CODE } from "../constants";
import { currentTimeSinceAD, hashMD5 } from "../lib";

export type EGameAction =
    | "USER_LOGIN"
    | "GET_BLOCK_MAP"
    | "GET_HERO_UPGRADE_POWER"
    | "PING_PONG"
    | "SYNC_BOMBERMAN"
    | "SYNC_HOUSE"
    | "START_PVE"
    | "STOP_PVE"
    | "GET_ACTIVE_BOMBER"
    | "START_EXPLODE"
    | "GO_SLEEP"
    | "GO_HOME"
    | "GO_WORK"
    | "GET_REWARD"
    | "COIN_DETAIL"
    | "GET_STORY_LEVEL_DETAIL"
    | "GET_STORY_MAP"
    | "START_STORY_EXPLODE"
    | "ENEMY_TAKE_DAMAGE"
    | "ENTER_DOOR";

export function hashGameMessage(
    wallet: string,
    action: EGameAction,
    messageId: number
) {
    const time = currentTimeSinceAD();
    const message = `${wallet}|${messageId}|${action}|${time}|${SALT_KEY}`;
    return [hashMD5(message), time];
}

export function hashLoginMessage(wallet: string) {
    const time = currentTimeSinceAD();
    const message = `${wallet}|LOGIN|${time}|${SALT_KEY}`;
    return [hashMD5(message), time];
}

export function makeGameMessage(
    wallet: string,
    action: EGameAction,
    messageId: number,
    data = new SFSObject()
) {
    const params = new SFSObject();
    const [hash, timestamp] = hashGameMessage(wallet, action, messageId);

    params.put("data", data, SFSDataType.SFS_OBJECT);
    params.put("id", messageId, SFSDataType.INT);
    params.put("hash", hash, SFSDataType.UTF_STRING);
    params.put("timestamp", timestamp, SFSDataType.LONG);

    return new ExtensionRequest(action, params);
}

export function makeLoginMessage(wallet: string) {
    const data = new SFSObject();
    const params = new SFSObject();
    const [hash, timestamp] = hashLoginMessage(wallet);

    data.put("pln", wallet, SFSDataType.UTF_STRING);
    data.put("password", "", SFSDataType.UTF_STRING);
    data.put("version_code", VERSION_CODE, SFSDataType.INT);
    data.put("lt", LT, SFSDataType.INT);

    params.put("lc", LC, SFSDataType.UTF_STRING);
    params.put("data", data, SFSDataType.SFS_OBJECT);
    params.put("hash", hash, SFSDataType.UTF_STRING);
    params.put("timestamp", timestamp, SFSDataType.LONG);

    return new LoginRequest(wallet, "", params);
}
