module.exports = {
    apps: [
        {
            name: "client1",
            instances: "1",
            exec_mode: "fork",
            script: "npm run start:bot",
            env: {
                DEBUG_LEVEL: "info",
                MIN_HERO_ENERGY_PERCENTAGE: "30",
                LOGIN: "user:CHANGE:CHANGE",
                TELEGRAM_KEY: "CHANGE",
                NETWORK: "POLYGON",
                ALERT_SHIELD: 50,
                NUM_HERO_WORK: 1,
                TELEGRAM_CHAT_ID: "CHANGE",
            },
        },
    ],
};
