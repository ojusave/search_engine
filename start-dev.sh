#!/bin/bash

# Fast Search Engine - Development Startup Script

echo "Starting Fast Search Engine Development Environment"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Setup backend
echo "Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "WARNING: Creating .env file from template..."
    cp env.example .env
    echo "Please edit backend/.env with your API keys:"
    echo "   - GROQ_API_KEY=your_groq_api_key_here"
    echo "   - EXA_API_KEY=your_exa_api_key_here"
    echo ""
fi

# Setup frontend
echo "Setting up frontend..."
cd ../frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "WARNING: Creating .env file from template..."
    cp env.example .env
    echo "Frontend .env is ready (defaults to localhost:8000)"
    echo ""
fi

echo "Setup complete!"
echo ""
echo "To start development:"
echo "1. Backend: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "URLs:"
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Don't forget to:"
echo "   - Get API keys from Groq (https://console.groq.com) and Exa (https://exa.ai)"
echo "   - Update backend/.env with your API keys"
echo "   - Check the README.md for detailed instructions"
