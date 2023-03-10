#!/bin/bash
cd ~
sudo apt update
sudo apt install git nano htop -y

curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt-get install gcc g++ make -y
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get update -y && sudo apt-get install yarn -y
sudo apt-get install -y nodejs
sudo apt install build-essential -y

node -v
npm -v
echo "instalando yarn e pm2"
sudo npm --force install -g yarn pm2


git clone https://github.com/lucasvieceli/bombcrypto-superbot.git
cd bombcrypto-superbot
yarn install