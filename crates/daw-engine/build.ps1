<#
.SYNOPSIS
    Builds the Rust DAW Engine for WebAssembly and deploys it to the public directory.
.DESCRIPTION
    1. Checks for required Rust toolchains.
    2. Builds the project using the nightly toolchain targeting wasm32-unknown-unknown.
    3. Deploys the resulting .wasm binary to the frontend public directory.
#>

$ErrorActionPreference = "Stop"

# Configuration
$TargetTriple = "wasm32-unknown-unknown"
$ArtifactPath = "target/$TargetTriple/release/daw_engine.wasm"
$DeployDir    = "../../public"
$DeployPath   = "$DeployDir/daw_engine.wasm"

function Log-Info {
    param([string]$Message)
    $Timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$Timestamp] [INFO] $Message" -ForegroundColor Cyan
}

function Log-Success {
    param([string]$Message)
    $Timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$Timestamp] [SUCCESS] $Message" -ForegroundColor Green
}

function Log-Error {
    param([string]$Message)
    $Timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$Timestamp] [ERROR] $Message" -ForegroundColor Red
}

try {
    # 1. Environment Verification
    Log-Info "Verifying Rust environment..."

    if (-not (Get-Command "rustup" -ErrorAction SilentlyContinue)) {
        throw "Rustup is not installed or not in PATH."
    }

    # Ensure the WASM target exists for the nightly toolchain
    Log-Info "Ensuring $TargetTriple target is installed..."
    rustup target add $TargetTriple --toolchain nightly

    # 2. Build Process
    Log-Info "Starting release build (nightly)..."
    # Note: Removed 'cargo clean' to utilize incremental compilation.
    # Run 'cargo clean' manually if a full rebuild is required.
    cargo +nightly build --target $TargetTriple --release

    if (-not (Test-Path $ArtifactPath)) {
        throw "Build finished but artifact was not found at: $ArtifactPath"
    }
    Log-Success "Build completed successfully."

    # 3. Deployment
    Log-Info "Deploying artifact to $DeployDir..."

    # Create directory if it does not exist (robustness check)
    if (-not (Test-Path $DeployDir)) {
        Log-Info "Creating directory: $DeployDir"
        New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null
    }

    # Remove old artifact if it exists to ensure no stale cache
    if (Test-Path $DeployPath) {
        Remove-Item $DeployPath -Force
    }

    Copy-Item -Path $ArtifactPath -Destination $DeployPath -Force

    if (Test-Path $DeployPath) {
        Log-Success "Deployment complete: $DeployPath"
    } else {
        throw "Failed to copy artifact to destination."
    }

} catch {
    Log-Error $_.Exception.Message
    exit 1
}
