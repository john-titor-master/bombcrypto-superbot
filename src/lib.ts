import * as crypto from "crypto";
import { DATE_OFFSET } from "./constants";
import { makeException } from "./err";
import { ILoginParams } from "./parsers/login";

export function identity(value: string) {
    return value;
}

export function parseNumber(value: string) {
    const parsed = Number(value);

    if (isNaN(parsed)) {
        const message = `Value '${value}' is not a number.`;
        throw makeException("ParserError", message);
    }

    return parsed;
}

export function parseBoolean(value: string) {
    return Boolean(Number(value));
}

export function requireEnv(key: string) {
    const value = process.env[key];

    if (value == null) {
        const message = `Enviroment variable '${key}' is missing.`;
        throw makeException("MissingEnv", message);
    }

    return value;
}

export function requireAndParseEnv<T>(
    key: string,
    parser: (value: string) => T
) {
    return parser(requireEnv(key));
}

export function parseLogin(value: string): ILoginParams {
    const fragments = value.split(":");

    const exception = makeException(
        "WrongUsage",
        "The login string should be " +
            "formatted as user|[username]|[password] " +
            "or wallet|[walletId]|[privateKey]"
    );

    if (fragments.length !== 3) throw exception;

    const [type, v1, v2] = fragments;

    if (type === "user") {
        return {
            type: "user",
            username: v1,
            password: v2,
        };
    } else if (type === "wallet") {
        return {
            type: "wallet",
            wallet: v1,
            privateKey: v2,
        };
    }

    throw exception;
}

export function askEnv(key: string) {
    return process.env[key];
}

export function askAndParseEnv<T>(
    key: string,
    parser: (value: string) => T,
    defaultVal: T
) {
    const value = askEnv(key);
    if (value == null) return defaultVal;
    return parser(value);
}

export function currentTimeSinceAD() {
    return Date.now() + DATE_OFFSET;
}

export function hashMD5(message: string) {
    const encoded = Buffer.from(message, "utf8");
    const cipher = crypto.createHash("md5");
    cipher.update(encoded);
    return cipher.digest("hex");
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
