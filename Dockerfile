FROM node:9-alpine
LABEL version="1.6.1"
COPY . /src
WORKDIR /src
ENTRYPOINT ["npm", "start"]
