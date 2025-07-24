# 🧠 Ule Msee AI Assistant

**One-File Backend Solution** - Everything you need in a single Python script!

## 🚀 Super Quick Start

### Option 1: Everything at Once
\`\`\`bash
pnpm run dev
\`\`\`

### Option 2: Backend First, Then Frontend
\`\`\`bash
# Terminal 1: Start backend
python start-ule-msee.py

# Terminal 2: Start frontend  
pnpm run dev:frontend
\`\`\`

### Option 3: Just Backend
\`\`\`bash
python start-ule-msee.py
\`\`\`

## ✅ What This Does

1. **Auto-installs** all Python dependencies
2. **Uses your Groq API key** from v0 integration automatically
3. **Starts the server** on http://localhost:8000
4. **Provides full API** with docs at http://localhost:8000/docs
5. **Ready for frontend** connection immediately

## 🔍 Verification

Once running, you should see:
- ✅ Server logs showing successful startup
- ✅ "Ule Msee Online" status in frontend
- ✅ Health check passes at http://localhost:8000/health
- ✅ API docs available at http://localhost:8000/docs

## 🎯 Features

- **Complete Backend**: Full FastAPI application with all endpoints
- **AI Integration**: Uses Groq's Llama 3 70B model
- **Question History**: Stores and manages conversation history
- **Error Handling**: Comprehensive error handling and fallbacks
- **CORS Enabled**: Works with any frontend
- **Auto-Documentation**: Interactive API docs included

## 🛠️ Troubleshooting

### "Python not found"
- Install Python 3.8+ from python.org
- Make sure it's in your PATH

### "Package installation failed"
- Check internet connection
- Try: \`python -m pip install --upgrade pip\`

### "Connection refused"
- Wait 10-15 seconds for full startup
- Check that port 8000 is available
- Refresh the frontend page

## 📚 API Endpoints

- \`GET /\` - Server status
- \`GET /health\` - Health check
- \`POST /api/question\` - Ask Ule Msee a question
- \`GET /api/history\` - Get question history
- \`DELETE /api/history/{id}\` - Delete history item
- \`DELETE /api/history\` - Clear all history

## 🎉 Success!

When everything works:
- Backend shows: "🚀 Ule Msee AI Assistant Backend Started Successfully"
- Frontend shows: "Ule Msee Online" badge
- You can ask questions and get AI responses

That's it! One file, one command, ready to go! 🧠✨
\`\`\`
