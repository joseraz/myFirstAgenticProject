#!/usr/bin/env bash

echo ""
echo "  ▌ Bedtime Routine Tracker"
echo "  ▌ Stopping servers"
echo ""

echo "  Stopping Flask (port 5001)..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

echo "  Stopping React (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "  Done."
echo ""
