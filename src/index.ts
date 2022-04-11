import { TreasureMapBot } from "./bot";
import {
    askAndParseEnv,
    identity,
    parseLogin,
    requireAndParseEnv,
} from "./lib";

async function main() {
    const params = requireAndParseEnv("LOGIN", parseLogin);

    const bot = new TreasureMapBot(
        params,
        askAndParseEnv("TELEGRAM_KEY", identity, "")
    );

    process.once("SIGINT", () => {
        bot.stop();
        process.exit();
    });
    process.once("SIGTERM", () => {
        bot.stop();
        process.exit();
    });

    await bot.loop();
}

main();
