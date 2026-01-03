FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Build stage
COPY . .
RUN npm run build

# Change port exposure to 8080 for Cloud Run
EXPOSE 8080

CMD ["npm", "start"]
