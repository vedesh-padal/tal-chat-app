FROM node:18-alpine

WORKDIR /usr/src/talchat-backend

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]
