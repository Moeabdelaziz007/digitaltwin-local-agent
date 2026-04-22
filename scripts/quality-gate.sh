#!/bin/bash

# scripts/quality-gate.sh
# The "Sovereign Shield": A strict pre-push/pre-build verification script.

echo "🛡️ Starting Sovereign Quality Gate..."

# 1. Type Check
echo "🔍 Phase 1: Neural Type Verification (TSC)..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "❌ TYPE ERROR DETECTED. Execution halted."
    exit 1
fi
echo "✅ Types Solid."

# 2. Build Check
echo "📦 Phase 2: Production Build Simulation..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ BUILD FAILED. Do not deploy a broken synapse."
    exit 1
fi
echo "✅ Build Successful."

# 3. Cleanliness Scan
echo "🧹 Phase 3: Debug Artifact Scan..."
npm run scan-bugs
if [ $? -ne 0 ]; then
    echo "⚠️ Warning: Potential debug artifacts found."
fi

echo "🚀 SYSTEM GREEN. Safe to push/deploy."
exit 0
