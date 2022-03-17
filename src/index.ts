import { TreasureMapBot } from "./bot";
import { askAndParseEnv, identity, requireEnv } from "./lib";
import express from 'express';

async function main() {
    const port = requireEnv("PORT")
    const app = express()

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

    app.get('/config', async (req, res) => {
        const data = await bot.getConfig()
        res.json(data)
    })

    app.get('/rewards', async (req, res) => {
        const data = await bot.getRewards()
        res.json(data)
    })

    app.get('/stats', async (req, res) => {
        const data = await bot.getStats()
        res.json(data)
    })

    app.listen(port, () => {
        console.log(`app listening on port ${port}`)
    })

    await bot.loop();
}

main();
