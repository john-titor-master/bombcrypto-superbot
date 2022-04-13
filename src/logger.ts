import winston from "winston";
import { askAndParseEnv, askEnv, parseBoolean } from "./lib";

const formatter = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const level = askEnv("DEBUG_LEVEL") || "info";

export const logger = winston.createLogger({
    level: askAndParseEnv("DEBUG", parseBoolean, false) ? "debug" : level,
    format: winston.format.combine(winston.format.timestamp(), formatter),
    transports: [new winston.transports.Console()],
});
