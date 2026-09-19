#!/usr/bin/env bash
# Start the Alban Zaman Dairy POS (backend + frontend) and open the browser.
# Works on Linux / macOS / Git-Bash on Windows.
set -e
cd "$(dirname "$0")"

echo "Starting backend & frontend (npm run dev)... log: .dev-server.log"
npm run dev > .dev-server.log 2>&1 &
DEV_PID=$!
trap "kill $DEV_PID 2>/dev/null" EXIT

echo "Waiting for http://localhost:3000 ..."
for i in $(seq 1 60); do
  if curl -fsS http://localhost:3000 > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Opening the app in your browser..."
if command -v xdg-open > /dev/null 2>&1; then
  xdg-open http://localhost:3000
elif command -v open > /dev/null 2>&1; then
  open http://localhost:3000
else
  echo "Open http://localhost:3000 manually."
fi

echo "No login required - single-owner system."
wait "$DEV_PID"