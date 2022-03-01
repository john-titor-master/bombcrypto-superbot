export type IEnemyParams = {
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

export function buildEnemy(params: IEnemyParams) {
    return new Enemy(params);
}

export class Enemy {
    private params!: IEnemyParams;

    get id() {
        return this.params.id;
    }

    get hp() {
        return this.params.hp;
    }

    constructor(params: IEnemyParams) {
        this.update(params);
    }

    update(params: IEnemyParams) {
        this.params = params;
    }

    updateHp(hp: number) {
        this.params.hp = hp;
    }
}
