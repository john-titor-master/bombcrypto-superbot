export type IGetBlockMapPayload = {
    type: number;
    i: number;
    j: number;
    hp: number;
    maxHp: number;
};

export const BLOCK_TYPE_MAP = {
    0: "Green",
    1: "Rock",
    2: "Cage",
    3: "WoodChest",
    4: "AmethystChest",
    5: "GoldChest",
    6: "DiamondChest",
    8: "KeyChest",
} as const;

export type EBlockType =
    | typeof BLOCK_TYPE_MAP[keyof typeof BLOCK_TYPE_MAP]
    | "Unknown";

export type IBlockParams = {
    type: EBlockType;
    i: number;
    j: number;
    hp: number;
    maxHp: number;
};

export function buildBlock(params: IBlockParams) {
    return new Block(params);
}

export class Block {
    private params!: IBlockParams;

    get type() {
        return this.params.type;
    }

    get i() {
        return this.params.i;
    }

    get j() {
        return this.params.j;
    }

    get hp() {
        return this.params.hp;
    }

    get maxHp() {
        return this.params.maxHp;
    }

    constructor(params: IBlockParams) {
        this.update(params);
    }

    updateHp(hp: number) {
        this.params.hp = hp;
    }

    update(params: IBlockParams) {
        this.params = params;
    }

    toString() {
        return `${this.type} [${(this.i, this.j)}] HP ${this.hp}/${this.maxHp}`;
    }
}
