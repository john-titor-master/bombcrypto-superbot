const REWARD_MAP = {
    BOMBERMAN: "Bomberman",
    BCOIN: "BCoin",
    KEY: "Key",
} as const;

export type ERewardType =
    | typeof REWARD_MAP[keyof typeof REWARD_MAP]
    | "Unknown";

export function parseRewardType(reward: string): ERewardType {
    function isRewardKey(reward: string): reward is keyof typeof REWARD_MAP {
        return reward in REWARD_MAP;
    }

    return isRewardKey(reward) ? REWARD_MAP[reward] : "Unknown";
}

export type IGetRewardPayload = {
    remainTime: number;
    type: ERewardType;
    value: number;
};

export type ICoinDetailPayload = {
    mined: number;
    invested: number;
    rewards: number;
};
