import { TreasureMapBot } from "./bot";
import {
    askAndParseEnv,
    identity,
    parseLogin,
    requireAndParseEnv,
} from "./lib";

async function main() {
    const params = requireAndParseEnv("LOGIN", parseLogin);

    const bot = new TreasureMapBot(params, {
        telegramKey: askAndParseEnv("TELEGRAM_KEY", identity, ""),
        minHeroEnergyPercentage: parseInt(
            askAndParseEnv("MIN_HERO_ENERGY_PERCENTAGE", identity, "90")
        ),
    });

    process.once("SIGINT", async () => {
        await bot.stop();
        process.exit();
    });
    process.once("SIGTERM", async () => {
        await bot.stop();
        process.exit();
    });

    await bot.loop();
}

main();
