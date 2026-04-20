#!/bin/bash
# ============================================================
# MyDigitalTwin Local Starter Script
# Launches Frontend, Backend, Sidecar, and local LLM
# ============================================================

set -e

# Export Paths
export PATH="/usr/local/Cellar/node@22/22.22.0/bin:/usr/local/Cellar/go/1.25.6/libexec/bin:$PATH"

echo "🪞 Starting MyDigitalTwin Ecosystem..."

# 1. Start Go Sidecar (Memory Worker)
cd sidecar
echo "⚙️ Starting Go Worker on :4242..."
./twin-worker &
SIDECAR_PID=$!
cd ..

# 2. Start PocketBase (ensure you downloaded pocketbase binary into project root, or we use a global one)
# Wait, for the script to work flawlessly, we assume user will run `pocketbase serve` manually or download it here.
if [ -f "./pocketbase" ]; then
  echo "💾 Starting PocketBase on :8090..."
  ./pocketbase serve --http="0.0.0.0:8090" &
  PB_PID=$!
else
  echo "⚠️ PocketBase binary not found in root. Assuming it's running globally."
fi

# Cleanup on exit
trap "echo 'Terminating...'; kill $SIDECAR_PID || true; [ -n \"$PB_PID\" ] && kill $PB_PID || true; exit" SIGINT SIGTERM

# 4. Wait for services to be ready
echo "⏳ Waiting for PocketBase..."
until curl -sf http://localhost:8090/api/health > /dev/null; do
  sleep 1
done
echo "✅ PocketBase ready."

if command -v ollama &> /dev/null; then
  echo "⏳ Waiting for Ollama..."
  until curl -sf http://localhost:11434/api/tags > /dev/null; do
    sleep 1
  done
  echo "✅ Ollama ready."
fi

echo "📱 Starting Next.js PWA Frontend (Performance Mode)..."
npm run dev

# Wait for background processes to exit if Dev Server stops
wait
