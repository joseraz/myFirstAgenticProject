#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ▌ Bedtime Routine Tracker"
echo "  ▌ Starting backend + frontend"
echo ""

# ── Clear stale processes ─────────────────────────────────────────────────────
echo "  Clearing any stale processes on ports 5001 and 3000..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# ── Backend ───────────────────────────────────────────────────────────────────
BACKEND="$ROOT/backend"

if ! command -v python3 &>/dev/null; then
  echo "  ERROR: python3 not found. Please install Python 3.9+."
  exit 1
fi

# Create virtualenv if needed
if [ ! -d "$BACKEND/.venv" ]; then
  echo "  Creating Python virtualenv..."
  python3 -m venv "$BACKEND/.venv"
fi

source "$BACKEND/.venv/bin/activate"

echo "  Installing Python dependencies..."
pip install -q -r "$BACKEND/requirements.txt"

echo "  Starting Flask on http://localhost:5001 ..."
python "$BACKEND/app.py" &
BACKEND_PID=$!

# ── Frontend ──────────────────────────────────────────────────────────────────
FRONTEND="$ROOT/frontend"

if ! command -v npm &>/dev/null; then
  echo "  ERROR: npm not found. Please install Node.js 18+."
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "  Installing Node dependencies (first run, takes a moment)..."
  npm install --prefix "$FRONTEND" --silent
fi

echo "  Starting React on http://localhost:3000 ..."
echo ""
echo "  Open http://localhost:3000 in your browser."
echo "  Press Ctrl+C to stop both servers."
echo ""

trap "echo ''; echo '  Stopping...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT TERM

npm start --prefix "$FRONTEND"
