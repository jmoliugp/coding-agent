#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d "$ROOT/backend/.venv" ]]; then
  echo "Backend venv not found. Run: bun run bootstrap"
  exit 1
fi

if [[ ! -f "$ROOT/.env" ]]; then
  echo ".env not found. Run: bun run bootstrap"
  exit 1
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "→ Starting backend on http://localhost:8000"
(
  cd "$ROOT/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  exec uvicorn main:app --reload --port 8000
) &
BACKEND_PID=$!

echo "→ Starting frontend on http://localhost:5173"
(
  cd "$ROOT/frontend"
  exec bun run dev
) &
FRONTEND_PID=$!

echo ""
echo "Dev servers running. Press Ctrl+C to stop both."
echo ""

wait
