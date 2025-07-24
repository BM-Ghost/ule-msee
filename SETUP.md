# 🚀 Ule Msee AI Assistant - Quick Setup Guide

## Option 1: Automated Setup (Recommended)

### Windows
\`\`\`cmd
setup.bat
\`\`\`

### Mac/Linux
\`\`\`bash
chmod +x setup.sh
./setup.sh
\`\`\`

### Cross-Platform
\`\`\`bash
npm install
npm run setup
\`\`\`

## Option 2: Manual Setup

### 1. Install Frontend Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Setup Backend
\`\`\`bash
npm run backend:install
\`\`\`

### 3. Configure API Key
Edit \`backend/.env\` and add your Groq API key:
\`\`\`env
GROQ_API_KEY=gsk_your_actual_key_here
\`\`\`

Get your free API key at: https://console.groq.com/

### 4. Start Development
\`\`\`bash
npm run dev
\`\`\`

## Troubleshooting

### "Python not found"
- Install Python 3.8+ from https://python.org
- Make sure Python is in your PATH
- Try using \`python3\` or \`py\` command

### "Backend directory not found"
- Run \`npm run backend:install\` first
- This will create all necessary backend files

### "GROQ_API_KEY not configured"
- Edit \`backend/.env\` file
- Add your API key: \`GROQ_API_KEY=gsk_your_key_here\`
- Get a free key at https://console.groq.com/

### "Connection failed"
- Make sure backend is running on port 8000
- Check that no other service is using port 8000
- Verify your API key is valid

## What Gets Created

The setup process creates:
- \`backend/\` directory with all Python files
- \`backend/main.py\` - FastAPI application
- \`backend/requirements.txt\` - Python dependencies
- \`backend/.env\` - Environment configuration
- \`backend/.env.example\` - Environment template

## Development Commands

- \`npm run dev\` - Start both frontend and backend
- \`npm run dev:frontend\` - Start only frontend
- \`npm run dev:backend\` - Start only backend
- \`npm run backend:install\` - Setup backend only

## Success Indicators

✅ Frontend running on http://localhost:3000
✅ Backend running on http://localhost:8000
✅ Connection status shows "Ule Msee Online"
✅ API docs available at http://localhost:8000/docs

Happy coding with Ule Msee! 🧠✨
