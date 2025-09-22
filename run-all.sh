#!/bin/bash

# Fast Search Engine - Start All Services
echo "Starting Fast Search Engine - All Services"
echo "=========================================="

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f uvicorn 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

# Start backend in background
echo "Starting backend server..."
(cd backend && source venv/bin/activate && uvicorn main:app --reload --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "Starting frontend server..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Wait for both to start
sleep 5

# Check if both services are running
echo "Checking services..."

# Check backend
if curl -s http://localhost:8000/health > /dev/null; then
    echo "Backend: http://localhost:8000 (PID: $BACKEND_PID)"
else
    echo "Backend failed to start"
fi

# Check frontend
if curl -s http://localhost:5173/ > /dev/null; then
    echo "Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
else
    echo "Frontend failed to start"
fi

echo ""
echo "Your AI Search Engine is ready!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Don't forget to add your API keys to backend/.env:"
echo "   GROQ_API_KEY=your_groq_key_here"
echo "   EXA_API_KEY=your_exa_key_here"
echo ""
echo "To stop all services: Ctrl+C or run 'pkill -f uvicorn && pkill -f \"npm run dev\"'"
echo ""

# Keep script running and show logs
echo "Live logs (Ctrl+C to stop all services):"
echo "======================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f uvicorn 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    echo "All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
