import winston from "winston";
import { askAndParseEnv, parseBoolean } from "./lib";

const formatter = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

export const logger = winston.createLogger({
    level: askAndParseEnv("DEBUG", parseBoolean, false) ? "debug" : "info",
    format: winston.format.combine(winston.format.timestamp(), formatter),
    transports: [new winston.transports.Console()],
});
