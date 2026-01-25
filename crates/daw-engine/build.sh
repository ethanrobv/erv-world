#!/bin/bash

# SYNOPSIS
#   Builds the Rust DAW Engine for WebAssembly and deploys it to the public directory.
#
# DESCRIPTION
#   1. Checks for required Rust toolchains.
#   2. Builds the project using the nightly toolchain targeting wasm32-unknown-unknown.
#   3. Deploys the resulting .wasm binary to the frontend public directory.

set -e # Exit immediately if a command exits with a non-zero status

# Configuration
TARGET_TRIPLE="wasm32-unknown-unknown"
ARTIFACT_PATH="target/$TARGET_TRIPLE/release/daw_engine.wasm"
DEPLOY_DIR="../../public"
DEPLOY_PATH="$DEPLOY_DIR/daw_engine.wasm"

# Logging Helpers
log_info() {
    echo -e "\033[0;36m[$(date +'%H:%M:%S')] [INFO] $1\033[0m"
}

log_success() {
    echo -e "\033[0;32m[$(date +'%H:%M:%S')] [SUCCESS] $1\033[0m"
}

log_error() {
    echo -e "\033[0;31m[$(date +'%H:%M:%S')] [ERROR] $1\033[0m"
}

# Error Trap
handle_error() {
    log_error "An error occurred on line $1"
    exit 1
}
trap 'handle_error $LINENO' ERR

# 1. Environment Verification
log_info "Verifying Rust environment..."

if ! command -v rustup &> /dev/null; then
    log_error "Rustup is not installed or not in PATH."
    exit 1
fi

# Ensure the WASM target exists for the nightly toolchain
log_info "Ensuring $TARGET_TRIPLE target is installed..."
rustup target add "$TARGET_TRIPLE" --toolchain nightly

# 2. Build Process
log_info "Starting release build (nightly)..."
# Note: Removed 'cargo clean' to utilize incremental compilation.
# Run 'cargo clean' manually if a full rebuild is required.
cargo +nightly build --target "$TARGET_TRIPLE" --release

if [ ! -f "$ARTIFACT_PATH" ]; then
    log_error "Build finished but artifact was not found at: $ARTIFACT_PATH"
    exit 1
fi
log_success "Build completed successfully."

# 3. Deployment
log_info "Deploying artifact to $DEPLOY_DIR..."

# Create directory if it does not exist
if [ ! -d "$DEPLOY_DIR" ]; then
    log_info "Creating directory: $DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR"
fi

# Remove old artifact if it exists
if [ -f "$DEPLOY_PATH" ]; then
    rm -f "$DEPLOY_PATH"
fi

cp "$ARTIFACT_PATH" "$DEPLOY_PATH"

if [ -f "$DEPLOY_PATH" ]; then
    log_success "Deployment complete: $DEPLOY_PATH"
else
    log_error "Failed to copy artifact to destination."
    exit 1
fi
