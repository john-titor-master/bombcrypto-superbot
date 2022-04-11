export type IWalletLoginParams = {
    type: "wallet";
    wallet: string;
    privateKey: string;
};

export type IUserLoginParams = {
    type: "user";
    username: string;
    password: string;
};

export type ILoginParams = IWalletLoginParams | IUserLoginParams;
