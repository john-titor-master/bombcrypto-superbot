FROM node:current-alpine3.15

RUN apk update ; \ 
apk -i upgrade \
 --no-cache \
 --progress 

COPY . /usr/app
WORKDIR /usr/app

RUN yarn install \
--prod \
--silent \
--ignore-optional \
--ignore-engines \
--link-duplicates \
--skip-integrity-check

RUN yarn build
RUN rm -rf /node_modules ; rm -rf /var/cache/apk/
RUN apk fix ; apk stats

CMD ["node", "-r", "./build/websocket.js", "--unhandled-rejections=strict", "build/index.js"]
