#!/bin/bash


error() {
    if [ $? != 0 ]; then
        echo "Error!"
        exit 122
    fi
}

build() {
    echo "=> Building bombcrypto-superbot"
    docker build -t bombcrypto-superbot .
    echo "=> Built bombcrypto-superbot"
}

tag() {
    echo "=> Tagging bombcrypto-superbot"
    docker tag bombcrypto-superbot vieceli/bombcrypto-superbot
    echo "=> Tagged bombcrypto-superbot"
}

push() {
    echo "=> Pushing bombcrypto-superbot"
    docker push vieceli/bombcrypto-superbot
    echo "=> Pushed bombcrypto-superbot"
}

build bombcrypto-superbot
error
tag bombcrypto-superbot
error
push bombcrypto-superbot
error
echo

exit 0