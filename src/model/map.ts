import { buildEnemy, Enemy, Hero, IEnemyParams, IStoryHeroParams } from ".";
import { makeException } from "../err";
import { Block } from "./block";

export type IMapParams = {
    blocks: Block[];
};

export type IMapBlockUpdateParams = {
    i: number;
    j: number;
    hp: number;
};

const WALL_TILE = { type: "Wall", icon: "█" } as const;
const EMPTY_TILE = { type: "Empty", icon: " " } as const;

type IMapTileBase = {
    i: number;
    j: number;
};

export type IMapTileBlock = IMapTileBase & {
    type: "Block";
    block: Block;
};
export type IMapTileWall = IMapTileBase & typeof WALL_TILE;
export type IMapTileEmpty = IMapTileBase & typeof EMPTY_TILE;

export function isBlockTile(tile: IMapTile): tile is IMapTileBlock {
    return tile.type === "Block";
}

export function isWallTile(tile: IMapTile): tile is IMapTileWall {
    return tile.type === "Wall";
}

export function isEmptyTile(tile: IMapTile): tile is IMapTileEmpty {
    return tile.type === "Empty";
}

export type IMapTile = IMapTileBlock | IMapTileWall | IMapTileEmpty;

export function buildTreasureMap(params: IMapParams) {
    return new TreasureMap(params);
}

function rangeInt(from: number, to: number) {
    const size = Math.max(to - from + 1, 0);
    return Array<number>(size)
        .fill(from)
        .map((start, i) => start + i);
}

export class TreasureMap {
    static readonly WIDTH = 35;
    static readonly HEIGHT = 17;

    private params!: IMapParams;
    private matrix!: IMapTile[];

    constructor(params: IMapParams) {
        this.update(params);
    }

    get blocks() {
        return this.matrix.filter(isBlockTile).map((tile) => tile.block);
    }

    isBarrier(i: number, j: number, blockIsBarrier = true) {
        const tile = this.at(i, j);
        return !isEmptyTile(tile) && (isWallTile(tile) || blockIsBarrier);
    }

    getTilesOnCross(
        range: number,
        i: number,
        j: number,
        blockIsBarrier = true
    ) {
        // Potential bounds respecting the map size
        const leftBound = Math.max(i - range, 0);
        const rightBound = Math.min(i + range, TreasureMap.WIDTH - 1);
        const topBound = Math.min(j + range, TreasureMap.HEIGHT - 1);
        const bottomBound = Math.max(j - range, 0);

        // Strict bounds respecting the walls or blocks
        const sLeftBound =
            rangeInt(leftBound, i - 1)
                .reverse()
                .find((k) => this.isBarrier(k, j, blockIsBarrier)) || leftBound;
        const sRightBound =
            rangeInt(i + 1, rightBound).find((k) =>
                this.isBarrier(k, j, blockIsBarrier)
            ) || rightBound;
        const sTopBound =
            rangeInt(j + 1, topBound).find((k) =>
                this.isBarrier(i, k, blockIsBarrier)
            ) || topBound;
        const sBottomBound =
            rangeInt(bottomBound, j - 1)
                .reverse()
                .find((k) => this.isBarrier(i, k, blockIsBarrier)) ||
            bottomBound;

        return {
            left: rangeInt(sLeftBound, i - 1).map((k) => this.at(k, j)),
            right: rangeInt(i + 1, sRightBound).map((k) => this.at(k, j)),
            top: rangeInt(j + 1, sTopBound).map((k) => this.at(i, k)),
            bottom: rangeInt(sBottomBound, j - 1).map((k) => this.at(i, k)),
        };
    }

    getHpOnCross(range: number, i: number, j: number, blockIsBarrier = true) {
        const addHp = (sum: number, tile: IMapTile) => {
            return sum + (isBlockTile(tile) ? tile.block.hp : 0);
        };
        const tiles = this.getTilesOnCross(range, i, j, blockIsBarrier);

        return {
            left: tiles.left.reduce(addHp, 0),
            right: tiles.right.reduce(addHp, 0),
            top: tiles.top.reduce(addHp, 0),
            bottom: tiles.bottom.reduce(addHp, 0),
        };
    }

    getHeroDamageOnCross(hero: Hero, i: number, j: number) {
        const tile = this.at(i, j);

        if (!isEmptyTile(tile))
            throw makeException(
                "InvalidMapIndices",
                `Tile at [${i}, ${j}] is not empty`
            );

        const cross = this.getHpOnCross(
            hero.range,
            i,
            j,
            !hero.hasSkill("BlockPiercing")
        );

        return {
            left: Math.min(cross.left, hero.damage),
            right: Math.min(cross.right, hero.damage),
            top: Math.min(cross.top, hero.damage),
            bottom: Math.min(cross.bottom, hero.damage),
        };
    }

    getHeroDamageForTile(hero: Hero, i: number, j: number) {
        const damage = this.getHeroDamageOnCross(hero, i, j);
        return damage.left + damage.right + damage.top + damage.bottom;
    }

    getHeroDamageForMap(hero: Hero) {
        return this.matrix
            .filter(isEmptyTile)
            .map((tile) => ({
                damage: this.getHeroDamageForTile(hero, tile.i, tile.j),
                tile,
            }))
            .sort((first, second) => {
                return second.damage - first.damage;
            });
    }

    private toCoords(k: number) {
        const i = k % TreasureMap.WIDTH;
        const j = Math.floor(k / TreasureMap.WIDTH);
        return [i, j];
    }

    private toIndex(i: number, j: number) {
        return j * TreasureMap.WIDTH + i;
    }

    private updateMatrix() {
        this.matrix = Array(TreasureMap.WIDTH * TreasureMap.HEIGHT)
            .fill(null)
            .map((_, k) => {
                const [i, j] = this.toCoords(k);
                if (this.isWall(i, j)) return { i, j, ...WALL_TILE };
                return { i, j, ...EMPTY_TILE };
            });

        this.params.blocks.forEach(
            (block) =>
                (this.matrix[this.toIndex(block.i, block.j)] = {
                    type: "Block",
                    block,
                    i: block.i,
                    j: block.j,
                })
        );
    }

    at(i: number, j: number) {
        const k = this.toIndex(i, j);

        if (k < 0 || k >= this.matrix.length)
            throw makeException(
                "InvalidMapIndices",
                `Indices [${i}, ${j}] are out of bounds`
            );

        return this.matrix[k];
    }

    update(params: IMapParams) {
        this.params = params;
        this.updateMatrix();
    }

    updateBlock(params: IMapBlockUpdateParams) {
        const tile = this.at(params.i, params.j);

        if (tile.type !== "Block") {
            const message = `Tile at [${params.i}, ${params.j}] is not a block`;
            throw makeException("InvalidMapIndices", message);
        }

        tile.block.updateHp(params.hp);
        const k = this.toIndex(params.i, params.j);
        if (params.hp <= 0)
            this.matrix[k] = { i: params.i, j: params.j, ...EMPTY_TILE };
    }

    get totalLife(): number {
        return this.blocks.reduce((total, block) => total + block.hp, 0);
    }

    get totalMaxLife(): number {
        return this.blocks.reduce((total, block) => total + block.maxHp, 0);
    }

    isWall(i: number, j: number) {
        return i % 2 === 1 && j % 2 === 1;
    }

    drawMap(): string {
        const WALL_ICON = "█";
        const TOP_WALL_ICON = "▄";
        const BOT_WALL_ICON = "▀";
        const EMPTY_ICON = " ";
        const ROCK_ICON = "▒";

        const MULT = 2;

        return [
            "  " + TOP_WALL_ICON.repeat(TreasureMap.WIDTH * MULT + 2),
            ...Array(TreasureMap.HEIGHT)
                .fill(null)
                .map(
                    (_, j) =>
                        j.toString().padStart(2, "0") +
                        WALL_ICON +
                        Array(TreasureMap.WIDTH)
                            .fill(null)
                            .map((_, i) => {
                                const tile = this.at(i, j);
                                if (isBlockTile(tile)) {
                                    return tile.block.type === "Rock"
                                        ? ROCK_ICON
                                        : tile.block.type[0];
                                } else
                                    return isEmptyTile(tile)
                                        ? EMPTY_ICON
                                        : WALL_ICON;
                            })
                            .map((icon) => icon.repeat(MULT))
                            .join("") +
                        WALL_ICON
                )
                .reverse(), // Rows
            "  " + BOT_WALL_ICON.repeat(TreasureMap.WIDTH * MULT + 2),
            "   " +
                Array(TreasureMap.WIDTH)
                    .fill(0)
                    .map((_, i) => i.toString().padStart(2, "0"))
                    .join(""),
        ].join("\n");
    }

    toString(): string {
        return `Map: ${this.totalLife}/${this.totalMaxLife}`;
    }
}

export type IStoryMapParams = {
    blocks: Block[];
    enemies: IEnemyParams[];
    hero: IStoryHeroParams;
    col: number;
    row: number;
    level: number;
    door_x: number;
    door_y: number;
};

export type IUpdateEnemyHpParams = {
    id: number;
    hp: number;
};

export class StoryMap {
    private params!: IStoryMapParams;
    private enemies!: Enemy[];

    constructor(params: IStoryMapParams) {
        this.update(params);
    }

    update(params: IStoryMapParams) {
        this.params = params;
        this.enemies = this.params.enemies.map(buildEnemy);
    }

    aliveEnemies() {
        return this.enemies.filter((enemy) => enemy.hp > 0);
    }

    enemyById(id: number) {
        return this.enemies.find((enemy) => enemy.id === id);
    }
}
