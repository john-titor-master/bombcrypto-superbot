import { IHeroUpdateParams, IMapBlockUpdateParams } from "../model";

export type IStartExplodeBlocksPayload = {
    hp: number;
    i: number;
    j: number;
};

export type IStartExplodePayload = {
    id: number;
    energy: number;
    blocks: IStartExplodeBlocksPayload[];
};

export type IStartExplodeInput = {
    heroId: number;
    bombId: number;
    i: number;
    j: number;
    blocks: {
        i: number;
        j: number;
    }[];
};

export function parseStartExplodePayload(
    payload: IStartExplodePayload
): [IMapBlockUpdateParams[], IHeroUpdateParams] {
    const blocksUpdate = payload["blocks"];
    const heroUpdate = { id: payload["id"], energy: payload["energy"] };

    return [blocksUpdate, heroUpdate];
}

export type IStartStoryExplodeInput = IStartExplodeInput & {
    isHero: true;
};
