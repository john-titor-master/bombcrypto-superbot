import { parseRevBin, toRevBin } from ".";
import { makeException } from "../err";
import { IHouseParams, IHouseStats } from "../model";

function parseHouseStats(genId: string): IHouseStats {
    const GI_ID = 0;
    const GI_UNKNOWN0 = 30;
    const GI_RARITY = 40;
    const GI_RECOVERY = 45;
    const GI_SLOTS = 60;

    const binRevGenId = toRevBin(genId);
    if (binRevGenId.length < GI_SLOTS)
        throw makeException("InvalidGenId", `gen_id '${genId}' is invalid.`);

    return {
        id: parseRevBin(binRevGenId, GI_ID, GI_UNKNOWN0),
        unknown0: parseRevBin(binRevGenId, GI_UNKNOWN0, GI_RARITY),
        rarity: parseRevBin(binRevGenId, GI_RARITY, GI_RECOVERY),
        recovery: parseRevBin(binRevGenId, GI_RECOVERY, GI_SLOTS),
        slots: parseRevBin(binRevGenId, GI_SLOTS, binRevGenId.length),
    };
}

export type ISyncHousePayload = {
    house_gen_id: string;
    active: number;
};

export function parseSyncHousePayload(
    payload: ISyncHousePayload
): IHouseParams {
    return {
        active: Boolean(payload.active),
        ...parseHouseStats(payload.house_gen_id),
    };
}
