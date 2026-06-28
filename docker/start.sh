#!/bin/sh
set -e

node /app/server/index.js &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}

trap cleanup INT TERM

sleep 1
if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "API server failed to start" >&2
  exit 1
fi

exec nginx -g "daemon off;"
