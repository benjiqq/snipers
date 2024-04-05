FROM node:20-alpine

# Install dockerize
ENV DOCKERIZE_VERSION v0.7.0
RUN apk update --no-cache \
    && apk add --no-cache wget openssl \
    && wget -O - https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz | tar xzf - -C /usr/local/bin \
    && apk del wget

WORKDIR /src

COPY . /src

RUN yarn global add pm2

RUN yarn install && yarn build

CMD [ "yarn", "run", "pooltracker"]

#pm2 start yarn --name "pooltracker" -- run pooltracker
