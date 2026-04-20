#!/bin/bash

# Simple script to download a static FFmpeg binary for macOS
# Source: evermeet.cx (Official static builds for macOS)

set -e

BIN_DIR="sidecar/bin"
mkdir -p $BIN_DIR

echo "🎬  Downloading FFmpeg static binary for macOS..."
# Using the stable ffmpeg 7.0+ 
curl -L https://evermeet.cx/ffmpeg/ffmpeg-7.0.zip -o ffmpeg.zip

echo "📦  Extracting..."
unzip -o ffmpeg.zip -d $BIN_DIR
rm ffmpeg.zip

chmod +x $BIN_DIR/ffmpeg
echo "✅  FFmpeg is ready at $BIN_DIR/ffmpeg"
$BIN_DIR/ffmpeg -version | head -n 1
