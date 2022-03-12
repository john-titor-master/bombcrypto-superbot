import { EHeroState } from ".";
import { makeException } from "../err";
import { Hero } from "./hero";

type ISquadParams = {
    heroes: Hero[];
};

export type IHeroUpdateParams = {
    id: number;
    energy: number;
};

export class Squad {
    private params!: ISquadParams;
    private heroById!: Map<number, Hero>;

    constructor(params: ISquadParams) {
        this.update(params);
    }

    get heroes() {
        return this.params.heroes;
    }

    get activeHeroes() {
        return this.heroes.filter((hero) => hero.active);
    }

    get rarest() {
        return this.activeHeroes.sort(
            (first, second) => second.rarityIndex - first.rarityIndex
        )[0];
    }

    get notWorking() {
        return this.activeHeroes.filter((hero) => hero.state !== "Work");
    }

    update(params: ISquadParams) {
        this.params = params;
        this.heroById = new Map(this.heroes.map((hero) => [hero.id, hero]));
    }

    updateHeroEnergy(params: IHeroUpdateParams) {
        const hero = this.byId(params.id);
        hero.updateEnergy(params.energy);
    }

    updateHeroState(heroId: number, state: EHeroState) {
        const hero = this.byId(heroId);
        hero.setState(state);
    }

    byState(state: EHeroState) {
        return this.activeHeroes.filter((hero) => hero.state === state);
    }

    byId(id: number) {
        const hero = this.heroById.get(id);
        if (!hero) {
            const message = `Hero with id '${id}' not present`;
            throw makeException("InvalidHeroId", message);
        }
        return hero;
    }
}
