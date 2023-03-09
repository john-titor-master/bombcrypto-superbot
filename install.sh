#!/bin/bash
sudo apt update
apt-get install unzip wget -y

if [ "$(uname -m)" == "aarch64" ]; then
    # Se for ARM64
    URL="https://github.com/lucasvieceli/bombcrypto-superbot/releases/latest/download/bot-arm64.zip"
    exit 1
else if [ "$(uname -m)" == "x86_64" ]; then
    # Se for x64
    URL="https://github.com/lucasvieceli/bombcrypto-superbot/releases/latest/download/bot-x64.zip"
else
    echo "not supported"
     exit 1
fi


wget -O bot.zip "$URL"
unzip  -o bot.zip
rm bot.zip
