export const HOUSE_TYPE_ARRAY = [
    "Tiny",
    "Mini",
    "Luxury",
    "Pent",
    "Villa",
    "SuperVilla",
] as const;

export type EHouseType = typeof HOUSE_TYPE_ARRAY[number] | "Unknown";

export type IHouseStats = {
    id: number;
    slots: number;
    rarity: number;
    recovery: number;
    unknown0: number;
};

export type IHouseParams = IHouseStats & {
    active: boolean;
};

export function buildHouse(params: IHouseParams) {
    return new House(params);
}

export class House {
    private params!: IHouseParams;

    get id() {
        return this.params.id;
    }

    get slots() {
        return this.params.slots;
    }

    get active() {
        return this.params.active;
    }

    get recovery() {
        return this.params.recovery;
    }

    get recoveryPerMin() {
        return this.params.recovery / 60;
    }

    get unknown0() {
        return this.params.unknown0;
    }

    get rarity() {
        return this.params.rarity;
    }

    get type(): EHouseType {
        return HOUSE_TYPE_ARRAY[this.rarity] || "Unknown";
    }

    constructor(params: IHouseParams) {
        this.update(params);
    }

    update(params: IHouseParams) {
        this.params = params;
    }

    toString() {
        return `${this.id} ${this.type} SLT ${this.slots}`;
    }
}
