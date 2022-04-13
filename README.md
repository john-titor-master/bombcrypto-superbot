
> :warning: **There are risks when using any kind of unofficial software**: Be very careful! If you lose your account, it is entirely your responsibility.

# Bombcrypto-superbot

This bot is a product of reverse engineering Bombcrypto game. It simulates the game and send messages using `websocket`. Since it does not require a browser to work, the main usage is for **multi-account**. Have fun!

## Features

It does the following:
- Automatic farming on Treasure Hunt
- Automatic Adventure mode (see usage section)
- Handles Home feature if a house is available

## Installation

You need the following packages installed for this bot to work:

- https://git-scm.com/downloads
- https://nodejs.org/en/download/ Version **16** at least.

Open bash on a folder you want the project to be cloned. Windows users (*shame*) can open **Git Bash** right-clicking on the Desktop folder or any other folder.

With a bash window open:

```bash
npm install -g yarn
git clone https://github.com/john-titor-master/bombcrypto-superbot
cd bombcrypto-superbot
yarn install
```

Whenever the project updates, you can update your local files through `git`. Open a bash terminal on the project folder (right-click **Git Bash** inside the project folder for Windows users):

```bash
git pull
```

This command may fail if you have changed some of the files locally. If you did that, I assume you know how to use `git`. If you do not, https://git-scm.com/book.

## Usage

Open a bash terminal on the project folder, run the following command:

```bash
LOGIN=[login] TELEGRAM_KEY=[telegram_key] yarn go
```

The envirement variables are explained below:
- `[login]` (**required**): The login string should be written in of the the following formats:
    - Login/Password mode: `user:[username]:[password]`. In this mode, you pass the `username` and the `password` registered for scholarship. The final string fould be like `LOGIN=user:username1:password1`.
    - Wallet/PrivateKey mode (:warning: **Not recommended**. Do not share your private key with anyone.): `wallet:[walletId]:[privateKey]`. In this mode, you pass the `walletId` and the `privateKey` of your wallet in order to login with full access. This mode mimics the Metamask login process. This mode is here only for completeness.
- `[telegram_key]` (optional): The key of a telegram bot. See Telegram integration section.
- `[MIN_HERO_ENERGY_PERCENTAGE]` (optional): Percentage that will put the heroes to work.
- `[adventure]`: **Deprecated** for now.

## Telegram integration

If you want to see the progress of the bot on your phone, you may create a telegram bot through BotFather (https://t.me/botfather). With the created key, pass the `TELEGRAM_KEY` enviroment variable when initializing the bot.

Start a conversation with the created bot and send the following:
- `/stats`: Brings information about the current map life, the amount of working heroes and the current hero selection identifier.
- `/rewards`: Brings the current amount of coins, heroes to be claimed and keys you have in your account.
- `/exit`: Will kill the bot.

## Resilience and multi-account

If you want the bot to never stop running for any exception (sometime the server of the games fails and you gave a **PromiseTimeout** exceptio), you can build the project using Docker.

Install Docker: https://docs.docker.com/desktop/

Open a bash terminal on the project folder:

```bash
docker build . -t bsb
```

> This should be done whenever the projects gets updated.

Now, create a `.env` file with the enviroment variables from the initialization, like:

```
WALLET_ID=
TELEGRAM_KEY=
```

Fill the values after the `=` (equal) sign. Leave `TELEGRAM_KEY` empty if you do not need it.

To run the bot in **interactive mode**:

```bash
docker run --env-file=.env --name bsb1 -it bsb
```

In interactive mode, you will see the logs just as usual. But you may want it to keep running if something fails, you must run it in **detached mode** then:

```bash
docker run --env-file=.env --restart=always --name bsb1 -dt bsb
```

The `--restart=always` option will restart the bot if some error occurs. No output will be seen on this approach. if you want to see the logs:

```bash
docker logs bsb1 --tail 200 -f
```

The option `--tail 200` will show the last 200 lines of output, the `-f` option will follow the logs as they are shown. To stop logging press the `CANCEL` command, on most cases press `CTRL+C` on the terminal window.

To list running bots (docker containers):

```bash
docker ps
```

To remove the running bot:

```bash
docker rm bsb1 -f
```

You may create as many `.env` files as you need. For each account you run using Docker, give a different name when running the `docker run` command. For each bot, you need a **different** telegram key to communicate with them. All commands listed here a simple Docker commands, I highly recommend studying them at the official documentation and learn how it works.

## Docker-compose

Copy the docker-compose.yml file and rename the copy to docker-compose-local.yml, modify the file with your accounts, you can put as many accounts as you like, example of two accounts:

```bash
version: "3.4"

services:
  bomb1:
    build: .
    restart: always
    working_dir: "/bombcrypto-superbot"
    environment:
      LOGIN: "MUDAR"
      TELEGRAM_KEY: "MUDAR"
  bomb2:
    build: .
    restart: always
    working_dir: "/bombcrypto-superbot"
    environment:
      LOGIN: "MUDAR"
      TELEGRAM_KEY: "MUDAR"
```

To start all accounts at once, run

```bash
docker-compose -f docker-compose-local.yml up
```

To always keep your code up to date, run

```bash
git update && docker-compose -f docker-compose-local.yml up --build
```

## Donations

There is no need to donate to this project. I work on it just for fun. Its a hobby. But if
you truly insist: BEP20 `0x2E11Fd7125876B3B34C54D13Bb815FFC719c438c`.
