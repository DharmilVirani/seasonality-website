FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18
WORKDIR /app
COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "start"]