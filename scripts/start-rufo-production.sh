#!/bin/zsh

set -euo pipefail

APP_DIR="/Users/rufo/Library/Application Support/Rufo"
NODE_BIN="/Users/rufo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"

export PATH="$NODE_BIN:$PATH"
export HOSTNAME="0.0.0.0"
export PORT="3000"
cd "$APP_DIR"

if [[ -f .env.local ]]; then
  set -a
  source .env.local
  set +a
fi

exec "$NODE_BIN/node" server.js
