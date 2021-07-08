##build app
FROM node:14.11-alpine as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json /app/package.json
RUN yarn
COPY . /app
RUN yarn build
## setup prod web server
FROM nginx:1.16.0-alpine
COPY --from=build /app/build /usr/share/nginx/html
## put our nginx conf
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
