FROM node:14.11-alpine
WORKDIR /usr/src/api
COPY package*.json ./
RUN yarn
COPY . .
EXPOSE 8080
CMD [ "yarn", "start:prod" ]
