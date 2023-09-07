FROM node:18.17.1-bullseye

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8848

# 运行应用
CMD ["npm", "start"]
