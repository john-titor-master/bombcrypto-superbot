import { SFSArray, SFSObject } from "sfs2x-api";
import Web3 from "web3";
import { currentTimeSinceAD } from "../lib";
import { IEnemyTakeDamageInput } from "../parsers";
import {
    IStartExplodeInput,
    IStartStoryExplodeInput,
} from "../parsers/explosion";
import { ILoginParams } from "../parsers/login";
import { hashGameMessage, makeGameMessage, makeLoginMessage } from "./base";

export function makePingPongRequest(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "PING_PONG", messageId);
}

export function makeGetBlockMapRequest(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "GET_BLOCK_MAP", messageId);
}

export function makeGetHeroUpgradePowerRequest(
    wallet: string,
    messageId: number
) {
    return makeGameMessage(wallet, "GET_HERO_UPGRADE_POWER", messageId);
}

export function makeLoginSignature(privateKey: string, message: string) {
    const web3 = new Web3();
    const result = web3.eth.accounts.sign(message, privateKey);

    return result.signature;
}

export function makeLoginRequest(params: ILoginParams, message: string) {
    return params.type === "user"
        ? makeLoginMessage(params.username, params.password, "", 1)
        : makeLoginMessage(
              params.wallet,
              "",
              makeLoginSignature(params.privateKey, message),
              0
          );
}

export function makeSyncBombermanRequest(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "SYNC_BOMBERMAN", messageId);
}

export function makeStartPVERequest(
    wallet: string,
    messageId: number,
    modeAmazon: boolean
) {
    const data = new SFSObject();
    data.putUtfString("slogan", "gold_miner");
    data.putInt("mode", modeAmazon ? 3 : 1);
    return makeGameMessage(wallet, "START_PVE", messageId, data);
}

export function makeStopPVERequest(wallet: string, messageId: number) {
    const data = new SFSObject();
    data.putUtfString("slogan", "stick_war");
    return makeGameMessage(wallet, "STOP_PVE", messageId, data);
}

export function makeSyncHouseRequest(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "SYNC_HOUSE", messageId);
}

export function makeGetRewardRequest(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "GET_REWARD", messageId);
}

export function makeCoinDetailRequest(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "COIN_DETAIL", messageId);
}

export function makeGetActiveBomberRequest(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "GET_ACTIVE_BOMBER", messageId);
}

export function makeGoSleepRequest(
    wallet: string,
    messageId: number,
    heroId: number
) {
    const data = new SFSObject();
    data.putLong("id", heroId);
    return makeGameMessage(wallet, "GO_SLEEP", messageId, data);
}

export function makeGoHomeRequest(
    wallet: string,
    messageId: number,
    heroId: number
) {
    const data = new SFSObject();
    data.putLong("id", heroId);
    return makeGameMessage(wallet, "GO_HOME", messageId, data);
}

export function makeGoWorkRequest(
    wallet: string,
    messageId: number,
    heroId: number
) {
    const data = new SFSObject();
    data.putLong("id", heroId);
    return makeGameMessage(wallet, "GO_WORK", messageId, data);
}

export function makeStartExplodeRequest(
    wallet: string,
    messageId: number,
    input: IStartExplodeInput
) {
    const data = new SFSObject();
    const encodedBlocks = new SFSArray();

    data.putLong("id", input.heroId);
    data.putInt("num", input.bombId);
    data.putInt("i", input.i);
    data.putInt("j", input.j);

    input.blocks.forEach((block) => {
        const encodedBlock = new SFSObject();

        encodedBlock.putInt("i", block.i);
        encodedBlock.putInt("j", block.j);

        encodedBlocks.addSFSObject(encodedBlock);
    });

    data.putSFSArray("blocks", encodedBlocks);

    return makeGameMessage(wallet, "START_EXPLODE", messageId, data);
}
export function makeStartExplodeV2Request(
    wallet: string,
    messageId: number,
    input: IStartExplodeInput
) {
    const data = new SFSObject();
    const encodedBlocks = new SFSArray();

    data.putLong("id", input.heroId);
    data.putInt("num", input.bombId);
    data.putInt("i", input.i);
    data.putInt("j", input.j);

    input.blocks.forEach((block) => {
        const encodedBlock = new SFSObject();

        encodedBlock.putInt("i", block.i);
        encodedBlock.putInt("j", block.j);

        encodedBlocks.addSFSObject(encodedBlock);
    });

    data.putSFSArray("blocks", encodedBlocks);

    return makeGameMessage(wallet, "START_EXPLODE_V2", messageId, data);
}

export function makeGetStoryLevelDetail(wallet: string, messageId: number) {
    return makeGameMessage(wallet, "GET_STORY_LEVEL_DETAIL", messageId);
}

export function makeGetStoryMap(
    wallet: string,
    messageId: number,
    heroId: number,
    level: number
) {
    const data = new SFSObject();

    data.putInt("level", level);
    data.putLong("hero_id", heroId);
    data.putInt("ticket_type", 0);
    data.putUtfString("slogan", "bomb_squad");

    return makeGameMessage(wallet, "GET_STORY_MAP", messageId, data);
}

export function makeStartExplodeExplodeRequest(
    wallet: string,
    messageId: number,
    input: IStartStoryExplodeInput
) {
    const data = new SFSObject();
    const encodedBlocks = new SFSArray();
    const bombId = currentTimeSinceAD();
    data.putInt("id", input.heroId);
    data.putBool("is_hero", input.isHero);
    data.putLong("bombId", bombId);
    // data.putInt("i", input.i > 0 ? input.i - 1 : input.i);
    // data.putInt("j", input.j > 0 ? input.j - 1 : input.j);
    data.putInt("i", input.i);
    data.putInt("j", input.j);

    input.blocks.forEach((block) => {
        const encodedBlock = new SFSObject();

        encodedBlock.putInt("i", block.i);
        encodedBlock.putInt("j", block.j);

        encodedBlocks.addSFSObject(encodedBlock);
    });

    data.putSFSArray("blocks", encodedBlocks);

    return makeGameMessage(wallet, "START_STORY_EXPLODE", messageId, data);
}

export function makeEnemyTakeDamageRequest(
    wallet: string,
    messageId: number,
    input: IEnemyTakeDamageInput
) {
    let [, timestamp] = hashGameMessage(wallet, "ENEMY_TAKE_DAMAGE", messageId);

    if (typeof timestamp == "string") {
        timestamp = parseInt(timestamp);
    }

    const data = new SFSObject();

    data.putLong("timestamp", timestamp);
    data.putLong("hero_id", input.heroId);
    data.putInt("enemy_id", input.enemyId);

    return makeGameMessage(wallet, "ENEMY_TAKE_DAMAGE", messageId, data);
}

export function makeEnterDoorRequest(wallet: string, messageId: number) {
    const data = new SFSObject();

    data.putUtfString("slogan", "card_game");

    return makeGameMessage(wallet, "ENTER_DOOR", messageId, data);
}
