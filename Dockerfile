# ================================
# Build Rust/WASM
# ================================
FROM rust:1.93-slim-bookworm as rust-builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Setup Nightly toolchain

# Copy project files first to cache installation layer
COPY crates/daw-engine/Cargo.toml crates/daw-engine/Cargo.lock crates/daw-engine/rust-toolchain.toml ./
COPY crates/daw-engine/.cargo ./.cargo
# Force rustup to read rust-toolchain.toml, install Nightly tc & wasm32 target
RUN rustup show

COPY crates/daw-engine/src ./src

RUN cargo +nightly build \
    --target wasm32-unknown-unknown \
    --release \
    -Z build-std=std,panic_abort

# ================================
# Build SolidJS App
# ================================
FROM node:20-alpine as node-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

COPY --from=rust-builder /app/target/wasm32-unknown-unknown/release/daw_engine.wasm ./public/daw_engine.wasm

RUN npm run build

# ================================
# Serve Nginx
# ================================
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=node-builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
