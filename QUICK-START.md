# 🚀 Ule Msee AI Assistant - Quick Start

## Super Simple Setup (1 Command)

\`\`\`bash
pnpm run setup
\`\`\`

This will:
- ✅ Install Python dependencies automatically
- ✅ Use your Groq API key from v0 integration
- ✅ Start the backend server on port 8000
- ✅ No file creation or permission issues

## Alternative Commands

### Start Backend Only
\`\`\`bash
pnpm run backend:quick
\`\`\`

### Start Both Frontend and Backend
\`\`\`bash
pnpm run dev
\`\`\`

### Start Frontend Only
\`\`\`bash
pnpm run dev:frontend
\`\`\`

## What Happens

1. **Auto-Install**: Python packages are installed automatically
2. **API Key**: Uses your Groq API key: os.getenv("GROQ_API_KEY")
3. **Server Start**: Backend runs on http://localhost:8000
4. **Ready**: Frontend connects automatically

## Verification

✅ Backend: http://localhost:8000/health
✅ API Docs: http://localhost:8000/docs
✅ Frontend: http://localhost:3000

## Troubleshooting

### "Python not found"
- Install Python 3.8+ from python.org
- Make sure it's in your PATH

### "Connection failed"
- Wait 10-15 seconds for backend to fully start
- Check that port 8000 is not in use
- Refresh the frontend page

### "Package installation failed"
- Check internet connection
- Try: `python -m pip install --upgrade pip`

## Success Indicators

When everything is working:
- ✅ "Ule Msee Online" badge appears
- ✅ No connection errors in console
- ✅ You can ask questions and get responses

That's it! Ule Msee should be ready to provide AI-powered wisdom! 🧠✨
