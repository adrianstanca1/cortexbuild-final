FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production=false
COPY . .
RUN ./node_modules/.bin/tsc -p server/tsconfig.json
RUN npm prune --production
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["node", "server/dist/index.js"]
