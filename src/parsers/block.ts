import { BLOCK_TYPE_MAP, EBlockType, IBlockParams } from "../model";

function parseBlockType(blockType: number): EBlockType {
    function isBlockTypeNumber(
        blockType: number
    ): blockType is keyof typeof BLOCK_TYPE_MAP {
        return blockType in BLOCK_TYPE_MAP;
    }

    return isBlockTypeNumber(blockType) ? BLOCK_TYPE_MAP[blockType] : "Unknown";
}

export type IGetBlockMapPayload = {
    type: number;
    i: number;
    j: number;
    hp: number;
    maxHp: number;
};

export function parseGetBlockMapPayload(
    payload: IGetBlockMapPayload
): IBlockParams {
    return {
        ...payload,
        type: parseBlockType(payload.type),
    };
}
