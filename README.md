## Instalação

execute o seguinte codigo

```
sudo apt-get install unzip
wget --no-cache https://raw.githubusercontent.com/lucasvieceli/bombcrypto-superbot/main/install.sh
bash ./install.sh
```

## Atualizar o bot

execute o seguinte codigo

```
wget --no-cache https://raw.githubusercontent.com/lucasvieceli/bombcrypto-superbot/main/install.sh
bash ./install.sh
```

## Ver logs

```
ACTION=LOGS ./bot
```

para ver de uma conta especifica

```
ACTION=LOGS IDENTIFY=... ./bot
```

para ver somente os erros

```
ACTION=LOGS TYPE=err ./bot
```

## Add conta

```
ACTION=CREATE_ACCOUNT SERIAL=... LOGIN=... IDENTIFY=... etc ./bot
```

## Pausar todas as contas

```
ACTION=DELETE_ALL ./bot
```

## Removar uma conta do banco de dados

```
ACTION=REMOVE_ACCOUNT IDENTIFY=... ./bot
```

## Converter arquivo ecosystem.config.js para o novo padrao de criar conta

coloque o arquivo ecosystem.config.js no mesmo diatorio do arquivo do bot

execute

```
ACTION=CONVERT  ./bot
```

Vamos dizer que seu arquivo ecosystem seja assim

```
module.exports = {
    apps: [
        {
            name: "client1",
            instances: "1",
            exec_mode: "fork",
            script: "npm run start:bot",
            env: {
                DEBUG_LEVEL: "info",
                MIN_HERO_ENERGY_PERCENTAGE: "50",
                LOGIN: "user:CHANGE:CHANGE",
                TELEGRAM_KEY: "CHANGE",
                NETWORK: "POLYGON",
                ALERT_SHIELD: 50,
                NUM_HERO_WORK: 5,
                TELEGRAM_CHAT_ID: "CHANGE",
            },
        },
    ],
};

```

cada conta ira sair um resultado igual abaixo:

```
MIN_HERO_ENERGY_PERCENTAGE=50 IDENTIFY=client1 LOGIN=user:CHANGE:CHANGE TELEGRAM_KEY=CHANGE NETWORK=POLYGON ALERT_SHIELD=50 NUM_HERO_WORK=5 TELEGRAM_CHAT_ID=CHANGE
```

entao você copia essa saida e adicione o serial ficando assim:

```
ACTION=CREATE_ACCOUNT SERIAL=... MIN_HERO_ENERGY_PERCENTAGE=50 IDENTIFY=client1 LOGIN=user:CHANGE:CHANGE TELEGRAM_KEY=CHANGE NETWORK=POLYGON ALERT_SHIELD=50 NUM_HERO_WORK=5 TELEGRAM_CHAT_ID=CHANGE ./bot
```

faça isso para cada conta
