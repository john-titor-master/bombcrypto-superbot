import { parseHeroRarity } from ".";
import { IGetBlockMapPayload, IStoryHeroParams } from "../model";
import {
    IStoryDetailsParams,
    IStoryPlayedHero,
    IStoryReward,
} from "../model/story";

function parsePlayedHero(
    payload: IStoryPlayedBombersPayload
): IStoryPlayedHero {
    return {
        id: payload.id,
        remainingTime: payload.remaining_time,
    };
}

function parseReward(payload: IStoryLevelRewardsPayload): IStoryReward {
    return {
        firstWin: payload.first_win,
        rarity: parseHeroRarity(payload.rare),
        rarityIndex: payload.rare,
        replay: payload.replay,
    };
}

export type IStoryLevelRewardsPayload = {
    rare: number;
    replay: number;
    first_win: number;
};

export type IStoryPlayedBombersPayload = {
    id: number;
    remaining_time: number;
};

export type IStoryDetailsPayload = {
    level_rewards: IStoryLevelRewardsPayload[];
    is_new: boolean;
    current_level: number;
    max_level: number;
    hero_id: number;
    played_bombers: IStoryPlayedBombersPayload[];
};

export type IEnemies = {
    damage: number;
    maxHp: number;
    skin: number;
    hp: number;
    id: number;
    follow: boolean;
    bombSkin: number;
    speed: number;
    throughBrick: boolean;
};

export type IStoryMap = {
    col: number;
    door_x: number;
    level: number;
    positions: IGetBlockMapPayload[];
    enemies: IEnemies[];
    hero: IStoryHeroParams;
    row: number;
    door_y: number;
    ec: number;
};

export function parseStoryDetailsPayload(
    payload: IStoryDetailsPayload
): IStoryDetailsParams {
    return {
        currentLevel: payload.current_level,
        heroId: payload.hero_id,
        isNew: payload.is_new,
        maxLevel: payload.max_level,
        playedHeroes: payload.played_bombers.map(parsePlayedHero),
        rewards: payload.level_rewards.map(parseReward),
    };
}
