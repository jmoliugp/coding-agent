#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ Installing frontend dependencies (bun)..."
bun install

echo "→ Setting up Python virtualenv..."
cd "$ROOT/backend"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

pip install --upgrade pip
pip install -e .

cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ Created .env from .env.example — add your OPENAI_API_KEY before running tasks."
else
  echo "→ .env already exists, skipping."
fi

echo ""
echo "Bootstrap complete."
echo "  Frontend: bun run dev:frontend  → http://localhost:5173"
echo "  Backend:  bun run dev:backend   → http://localhost:8000"
echo "  Both:     bun run dev"
