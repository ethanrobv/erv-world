FROM node:20-alpine AS frontend-builder
WORKDIR /erv-world/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./

RUN npm run build

FROM node:20-alpine AS backend-builder
WORKDIR /erv-world/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./

RUN npm run build

FROM node:20-alpine
WORKDIR /erv-world

COPY server/package*.json ./
RUN npm ci --only=production

COPY --from=backend-builder /erv-world/server/dist ./dist

COPY --from=frontend-builder /erv-world/client/dist ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
