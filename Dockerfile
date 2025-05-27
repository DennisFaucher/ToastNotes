FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY src ./src
COPY server.js .
RUN mkdir -p /files
EXPOSE 80
CMD ["node", "server.js"]