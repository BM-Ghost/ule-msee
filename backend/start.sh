#!/bin/bash

# Start script for the FastAPI backend

echo "🚀 Starting AI Q&A Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Copying from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Please edit .env file and add your GROQ_API_KEY"
        echo "   You can get a free API key at: https://console.groq.com/"
        exit 1
    else
        echo "❌ Error: .env.example file not found"
        exit 1
    fi
fi

# Check if GROQ_API_KEY is set
if ! grep -q "GROQ_API_KEY=gsk_" .env 2>/dev/null; then
    echo "❌ Error: GROQ_API_KEY not found in .env file"
    echo "   Please add your Groq API key to the .env file"
    echo "   Get a free API key at: https://console.groq.com/"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Start the server
echo "🌟 Starting FastAPI server on http://localhost:8000"
echo "📚 API Documentation will be available at http://localhost:8000/docs"
echo ""
uvicorn main:app --reload --host 0.0.0.0 --port 8000
