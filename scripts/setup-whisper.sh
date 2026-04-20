#!/bin/bash

# MyDigitalTwin local Whisper setup script (Revised for compatibility)
# Targets: macOS (Metal/CoreML support via legacy Makefile)
# This version uses whisper.cpp v1.4.2 which supports 'make' directly without cmake.

set -e

REPO_URL="https://github.com/ggerganov/whisper.cpp"
VERSION="v1.4.2"
TARGET_DIR="sidecar/whisper"
MODEL_NAME="base.en"

echo "🎙️  Step 1: Downloading whisper.cpp $VERSION..."
if [ ! -d "$TARGET_DIR" ]; then
    # We download the archive to avoid large git history and ensure we have the exact version
    curl -L "${REPO_URL}/archive/refs/tags/${VERSION}.tar.gz" -o whisper.tar.gz
    tar -xzf whisper.tar.gz
    mv "whisper.cpp-${VERSION#v}" "$TARGET_DIR"
    rm whisper.tar.gz
else
    echo "✅  Directory already exists, skipping download."
fi

echo "🏗️  Step 2: Building whisper.cpp with Metal support..."
cd $TARGET_DIR

# On macOS, whisper.cpp v1.4.2 supports WHISPER_METAL=1
# We clean and build the 'main' example
make clean
make -j WHISPER_METAL=1 main

echo "📥  Step 3: Downloading model [$MODEL_NAME]..."
bash ./models/download-ggml-model.sh $MODEL_NAME

echo "🚀  Whisper setup complete!"
echo "Binary: $TARGET_DIR/main"
echo "Model: $TARGET_DIR/models/ggml-$MODEL_NAME.bin"
