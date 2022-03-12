import { parseRevBin, toRevBin } from ".";
import { makeException } from "../err";
import {
    EHeroRarity,
    EHeroSkill,
    EHeroSkin,
    EHeroState,
    IHeroParams,
    IHeroStats,
    STATE_ARRAY,
    HERO_RARITY_ARRAY,
    HERO_SKILL_MAP,
    HERO_SKIN_MAP,
} from "../model";

function parseHeroState(stage: number): EHeroState {
    return STATE_ARRAY[stage] || "Unknown";
}

export function parseHeroRarity(rarity: number): EHeroRarity {
    return HERO_RARITY_ARRAY[rarity] || "Unknown";
}

function parseHeroSkin(skin: number): EHeroSkin {
    function isSkinNumber(skin: number): skin is keyof typeof HERO_SKIN_MAP {
        return skin in HERO_SKIN_MAP;
    }

    return isSkinNumber(skin) ? HERO_SKIN_MAP[skin] : "Unknown";
}

function parseHeroSkill(skill: number): EHeroSkill {
    function isSkillNumber(
        skill: number
    ): skill is keyof typeof HERO_SKILL_MAP {
        return skill in HERO_SKILL_MAP;
    }

    return isSkillNumber(skill) ? HERO_SKILL_MAP[skill] : "Unknown";
}

function parseHeroStats(genId: string): IHeroStats {
    const GI_INDEX = 30;
    const GI_RARITY = 40;
    const GI_LEVEL = 45;
    const GI_VARIANT = 50;
    const GI_SKIN = 55;
    const GI_STAMINA = 60;
    const GI_SPEED = 65;
    const GI_BOMBSKIN = 70;
    const GI_SKILLCOUNT = 75;
    const GI_STRENGTH = 80;
    const GI_RANGE = 85;
    const GI_CAPACITY = 90;
    const GI_SKILLS = 95;

    const binRevGenId = toRevBin(genId);
    if (binRevGenId.length < GI_SKILLS)
        throw makeException("InvalidGenId", `gen_id '${genId}' is invalid.`);

    const skillFragment = binRevGenId.slice(GI_SKILLS);
    const skillSlices = skillFragment.match(/.{1,5}/g) || [];
    const skillIds = skillSlices.map((slice) =>
        parseInt(slice.split("").reverse().join(""), 2)
    );

    return {
        index: parseRevBin(binRevGenId, GI_INDEX, GI_RARITY),
        rarity: parseHeroRarity(parseRevBin(binRevGenId, GI_RARITY, GI_LEVEL)),
        rarityIndex: parseRevBin(binRevGenId, GI_RARITY, GI_LEVEL),
        level: parseRevBin(binRevGenId, GI_LEVEL, GI_VARIANT),
        variant: parseRevBin(binRevGenId, GI_VARIANT, GI_SKIN),
        skin: parseHeroSkin(parseRevBin(binRevGenId, GI_SKIN, GI_STAMINA)),
        stamina: parseRevBin(binRevGenId, GI_STAMINA, GI_SPEED),
        speed: parseRevBin(binRevGenId, GI_SPEED, GI_BOMBSKIN),
        bombSkin: parseRevBin(binRevGenId, GI_BOMBSKIN, GI_SKILLCOUNT),
        skillCount: parseRevBin(binRevGenId, GI_SKILLCOUNT, GI_STRENGTH),
        strength: parseRevBin(binRevGenId, GI_STRENGTH, GI_RANGE),
        range: parseRevBin(binRevGenId, GI_RANGE, GI_CAPACITY),
        capacity: parseRevBin(binRevGenId, GI_CAPACITY, GI_SKILLS),
        skills: skillIds.map(parseHeroSkill),
    };
}

export type IGetActiveBomberPayload = {
    stage: number;
    id: number;
    gen_id: string;
    energy: number;
};

export function parseGetActiveBomberPayload(
    payload: IGetActiveBomberPayload
): IHeroParams {
    return {
        id: payload["id"],
        state: parseHeroState(payload["stage"]),
        energy: payload["energy"],
        active: true,
        ...parseHeroStats(payload["gen_id"]),
    };
}

export type ISyncBombermanPayload = {
    stage: number;
    id: number;
    gen_id: string;
    energy: number;
    restore_hp: number;
    active: number;
};

export function parseSyncBombermanPayload(
    payload: ISyncBombermanPayload
): IHeroParams {
    return {
        id: payload["id"],
        state: parseHeroState(payload["stage"]),
        energy: payload["energy"] + payload["restore_hp"],
        active: Boolean(payload["active"]),
        ...parseHeroStats(payload["gen_id"]),
    };
}
