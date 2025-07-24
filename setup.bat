@echo off
echo 🚀 Setting up Ule Msee AI Assistant...

echo.
echo 📦 Installing frontend dependencies...
call npm install

echo.
echo 🔧 Setting up backend...
call npm run backend:install

echo.
echo 🎉 Setup complete!
echo.
echo 📝 Next steps:
echo 1. Edit backend\.env and add your GROQ_API_KEY
echo 2. Get a free API key at: https://console.groq.com/
echo 3. Run: npm run dev
echo.
pause
