const ERRORS = [
    "MissingEnv",
    "ParserError",
    "ConnectionFailed",
    "LoginFailed",
    "NotLoggedIn",
    "GetMapFailed",
    "MessageError",
    "WrongUsage",
    "InvalidGenId",
    "InvalidMapIndices",
    "InvalidHeroId",
    "GetHeroesFailed",
    "GetActiveHeroesFailed",
    "StartExplodeFailed",
    "PromiseTimeout",
] as const;

export type ISuperBotError = typeof ERRORS[number];

export class SuperBotException extends Error {
    private type: string;

    constructor(type: ISuperBotError, message: string) {
        super(message);
        this.name = "SuperBotException";
        this.type = type;
    }
}

export function makeException(type: ISuperBotError, message: string) {
    return new SuperBotException(type, `${type}: ${message}`);
}
