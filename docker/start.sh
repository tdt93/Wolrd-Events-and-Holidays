#!/bin/sh
set -e

node /app/server/index.js &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}

trap cleanup INT TERM

nginx -g "daemon off;"
