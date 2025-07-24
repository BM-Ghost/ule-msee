@echo off
echo 🚀 Setting up Ule Msee AI Assistant for Windows...
echo.

echo 📦 Installing frontend dependencies...
call pnpm install
if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo 🔧 Setting up backend...
call pnpm run backend:install
if errorlevel 1 (
    echo ❌ Failed to set up backend
    pause
    exit /b 1
)

echo.
echo 🎉 Setup complete!
echo.
echo 📝 Next steps:
echo 1. Edit backend\.env and add your GROQ_API_KEY
echo 2. Get a free API key at: https://console.groq.com/
echo 3. Run: pnpm run dev
echo.
pause
