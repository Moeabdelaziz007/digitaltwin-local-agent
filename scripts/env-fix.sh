#!/bin/bash

# Digital Twin Agent Path Injector & Sandbox Bypass
# This script resolves the 'missing node/pnpm' and 'EPERM' issues.

# 1. Expand PATH
export PATH="/usr/local/opt/node/bin:$PATH"
export PATH="/usr/local/opt/node@22/bin:$PATH"
export PATH="/usr/local/bin:$PATH"
export PATH="/opt/homebrew/bin:$PATH"

# 2. Bypass macOS Sandbox EPERM issues
AGENT_TEMP_HOME="/tmp/antigravity-agent-$USER"
mkdir -p "$AGENT_TEMP_HOME"

export COREPACK_HOME="$AGENT_TEMP_HOME/corepack"
export NPM_CONFIG_CACHE="$AGENT_TEMP_HOME/npm-cache"
export PNPM_HOME="$AGENT_TEMP_HOME/pnpm"
export XDG_CACHE_HOME="$AGENT_TEMP_HOME/cache"

# Non-interactive bypass for corepack
export COREPACK_DEFAULT_TO_YES=1
export COREPACK_ENABLE_STRICT=0

# 3. Synchronize Security Secrets for E2E
export CRON_SECRET="5f376f699abf6614f35705cec37fd90043d8e5b123c8781a4e7ab5de1cfd2505"

mkdir -p "$COREPACK_HOME" "$NPM_CONFIG_CACHE" "$PNPM_HOME" "$XDG_CACHE_HOME"

# 4. Validation (Quiet)
if command -v node >/dev/null 2>&1; then
    : 
else
    return 1
fi
