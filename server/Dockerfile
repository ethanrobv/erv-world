# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for TypeScript)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built artifacts from Stage 1
COPY --from=builder /app/dist ./dist

# Expose the port
EXPOSE 3001

# Start the server
CMD ["node", "dist/index.js"]
