#!/usr/bin/env bash
# One-command start: installs what's missing, builds the app, serves it on :8000.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d backend/.venv ]; then python3 -m venv backend/.venv && backend/.venv/bin/pip install -q -r backend/requirements.txt; fi
if [ ! -d frontend/node_modules ]; then (cd frontend && npm install); fi
(cd frontend && npm run build)
echo "Crew Health tablet: http://localhost:8000"
cd backend && exec .venv/bin/uvicorn app.server:app --host 0.0.0.0 --port 8000
