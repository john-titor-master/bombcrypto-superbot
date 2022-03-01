import { EHeroRarity, Squad } from ".";

export type IStoryReward = {
    rarity: EHeroRarity;
    rarityIndex: number;
    replay: number;
    firstWin: number;
};

export type IStoryPlayedHero = {
    id: number;
    remainingTime: number;
};

export type IStoryDetailsParams = {
    isNew: boolean;
    maxLevel: number;
    currentLevel: number;
    heroId: number;
    playedHeroes: IStoryPlayedHero[];
    rewards: IStoryReward[];
};

export function buildStoryDetails(params: IStoryDetailsParams) {
    return new StoryDetails(params);
}

export class StoryDetails {
    private params!: IStoryDetailsParams;

    get maxLevel() {
        return this.params.maxLevel;
    }

    get playedHeroes() {
        return this.params.playedHeroes;
    }

    bestToPlay(squad: Squad) {
        return squad.activeHeroes
            .filter(
                (hero) =>
                    !this.playedHeroes.some((played) => played.id === hero.id)
            )
            .sort((first, second) => second.rarityIndex - first.rarityIndex)[0];
    }

    constructor(params: IStoryDetailsParams) {
        this.update(params);
    }

    update(params: IStoryDetailsParams) {
        this.params = params;
    }
}
