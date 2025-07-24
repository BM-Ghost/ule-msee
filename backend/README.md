# AI Q&A FastAPI Backend

A FastAPI backend service that provides AI-powered question answering using Groq AI.

## Quick Setup

### 1. Navigate to Backend Directory
\`\`\`bash
cd backend
\`\`\`

### 2. Get Your Groq API Key
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the key (it starts with `gsk_`)

### 3. Set Up Environment
\`\`\`bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API key
# Replace 'your_groq_api_key_here' with your actual key
\`\`\`

### 4. Install Dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 5. Start the Server

**Option A: Using the start script (recommended)**
\`\`\`bash
# On Unix/Linux/Mac
chmod +x start.sh
./start.sh

# On Windows
start.bat
\`\`\`

**Option B: Using uvicorn directly**
\`\`\`bash
uvicorn main:app --reload
\`\`\`

### 6. Test the Connection
\`\`\`bash
python test_connection.py
\`\`\`

## Verification

Once running, you should see:
- Server running at `http://localhost:8000`
- API docs at `http://localhost:8000/docs`
- Health check at `http://localhost:8000/health`

## Troubleshooting

### "GROQ_API_KEY environment variable is not set"
- Make sure you created the `.env` file
- Verify your API key is in the format: `GROQ_API_KEY=gsk_...`
- The key should start with `gsk_`

### "Unable to connect to AI service"
- Check your internet connection
- Verify your Groq API key is valid
- Try regenerating your API key at console.groq.com

### "Address already in use"
- Another service is using port 8000
- Kill the process: `lsof -ti:8000 | xargs kill -9` (Mac/Linux)
- Or use a different port: `uvicorn main:app --reload --port 8001`

### Connection refused from frontend
- Make sure the backend is running on port 8000
- Check that CORS is properly configured
- Verify the frontend's `NEXT_PUBLIC_API_URL` points to `http://localhost:8000`

## API Endpoints

- `GET /health` - Health check
- `POST /api/question` - Ask a question
- `GET /api/history` - Get question history
- `DELETE /api/history/{id}` - Delete history item
- `DELETE /api/history` - Clear all history

## Features

- ✅ Groq AI integration with Llama 3 70B
- ✅ Automatic API documentation
- ✅ Input validation and error handling
- ✅ CORS support for frontend
- ✅ Question history management
- ✅ Health monitoring
- ✅ Comprehensive logging
\`\`\`

Now let's update the setup guide component to show the correct instructions:
