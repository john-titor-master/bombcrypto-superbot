import { TreasureMapBot } from "./bot";
import { askAndParseEnv, identity, requireEnv } from "./lib";

async function main() {
    const bot = new TreasureMapBot(
        requireEnv("WALLET_ID"),
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
