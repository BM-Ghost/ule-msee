@echo off
echo 🚀 Starting AI Q&A Backend...

REM Check if .env file exists
if not exist .env (
    echo ⚠️  Warning: .env file not found. Copying from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo 📝 Please edit .env file and add your GROQ_API_KEY
        echo    You can get a free API key at: https://console.groq.com/
        pause
        exit /b 1
    ) else (
        echo ❌ Error: .env.example file not found
        pause
        exit /b 1
    )
)

REM Check if virtual environment exists
if not exist venv (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Start the server
echo 🌟 Starting FastAPI server on http://localhost:8000
echo 📚 API Documentation will be available at http://localhost:8000/docs
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
