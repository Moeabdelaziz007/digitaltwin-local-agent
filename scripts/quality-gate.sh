#!/bin/bash

# DigitalMiniTwin Quality Gate
set -e

echo "🔍 [GATE] Starting Full Neural Scan..."

# 1. Type Check
echo "🛠️ [GATE] Validating TypeScript consistency..."
npx tsc --noEmit

# 2. Lint Check
echo "🧹 [GATE] Running ESLint hygiene check..."
npm run lint

# 3. Build Check
echo "🏗️ [GATE] Executing production build simulation..."
npm run build

echo "✅ [GATE] All systems nominal. Code is READY for deployment."
