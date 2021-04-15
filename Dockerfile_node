FROM node:14
WORKDIR /home/node/app

COPY . .
RUN yarn install

RUN yarn build
CMD ["yarn", "rtsp"]