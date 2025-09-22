#!/bin/bash

# Quick start script - starts both services in background
echo "Starting Fast Search Engine..."

# Kill existing processes
pkill -f uvicorn 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Start backend
(cd backend && source venv/bin/activate && uvicorn main:app --reload --host 127.0.0.1 --port 8000) &

# Start frontend  
(cd frontend && npm run dev) &

echo "Both services starting..."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo ""
echo "To stop: pkill -f uvicorn && pkill -f \"npm run dev\""
