#!/usr/bin/env python3
"""
Simple Ule Msee Backend for v0
This script installs dependencies and starts the server in one go
"""

import subprocess
import sys
import os
import tempfile
import threading
import time

def install_packages():
    """Install required packages"""
    packages = [
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0",
        "httpx==0.25.1",
        "pydantic==2.5.3"
    ]
    
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--quiet"
        ] + packages)
        print("✅ Packages installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install packages")
        return False

def create_backend_app():
    """Create the FastAPI application"""
    app_code = '''
import os
import sys
import uuid
import time
import asyncio
import logging
from datetime import datetime
from typing import List

import httpx
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Global state
class AppState:
    def __init__(self):
        self.startup_time = datetime.now()
        self.request_count = 0
        self.groq_client = None

app_state = AppState()

# FastAPI app
app = FastAPI(
    title="Ule Msee AI Assistant",
    description="AI-powered Q&A using Groq",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    
    @validator('question')
    def validate_question(cls, v):
        return v.strip()

class QuestionResponse(BaseModel):
    response: str
    model_used: str = "llama3-70b-8192"
    response_time: float

class HistoryItem(BaseModel):
    id: str
    question: str
    response: str
    timestamp: str
    model_used: str = "llama3-70b-8192"

class StatusResponse(BaseModel):
    status: str
    timestamp: str
    uptime_seconds: float = 0
    request_count: int = 0

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    groq_available: bool
    uptime_seconds: float = 0

# Storage
history_items: List[dict] = []

# Groq Client
class GroqClient:
    def __init__(self):
        # Use the API key from environment or fallback
        self.api_key = os.getenv("GROQ_API_KEY")
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama3-70b-8192"
        self.timeout = 30.0
        
        logger.info(f"🔑 Groq client initialized with key: {self.api_key[:10]}...")
    
    async def generate_response(self, question: str) -> tuple[str, str, float]:
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are Ule Msee, an AI assistant. Ule Msee means 'wisdom' in Swahili. Provide helpful, accurate answers."
                        },
                        {"role": "user", "content": question}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1500,
                }
                
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    ai_response = data["choices"][0]["message"]["content"]
                    response_time = time.time() - start_time
                    logger.info(f"✅ Response generated in {response_time:.2f}s")
                    return ai_response, self.model, response_time
                else:
                    logger.error(f"❌ Groq API error: {response.status_code}")
                    raise HTTPException(status_code=response.status_code, detail="Groq API error")
                    
        except Exception as e:
            logger.error(f"❌ Error: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate response")

def get_groq_client() -> GroqClient:
    if app_state.groq_client is None:
        app_state.groq_client = GroqClient()
    return app_state.groq_client

# Routes
@app.get("/")
async def root():
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    return StatusResponse(
        status="Ule Msee AI Assistant is running",
        timestamp=datetime.now().isoformat(),
        uptime_seconds=uptime,
        request_count=app_state.request_count
    )

@app.get("/health")
async def health_check():
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    
    groq_available = True
    try:
        get_groq_client()
    except:
        groq_available = False
    
    return HealthResponse(
        status="healthy" if groq_available else "degraded",
        timestamp=datetime.now().isoformat(),
        groq_available=groq_available,
        uptime_seconds=uptime
    )

@app.post("/api/question")
async def ask_question(request: QuestionRequest, groq_client: GroqClient = Depends(get_groq_client)):
    try:
        app_state.request_count += 1
        logger.info(f"📝 Question: {request.question[:50]}...")
        
        response_text, model_used, response_time = await groq_client.generate_response(request.question)
        
        # Save to history
        history_item = {
            "id": str(uuid.uuid4()),
            "question": request.question,
            "response": response_text,
            "timestamp": datetime.now().isoformat(),
            "model_used": model_used
        }
        history_items.append(history_item)
        
        # Keep last 50 items
        if len(history_items) > 50:
            history_items.pop(0)
        
        return QuestionResponse(
            response=response_text,
            model_used=model_used,
            response_time=response_time
        )
    except Exception as e:
        logger.error(f"❌ Error in ask_question: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/history")
async def get_history():
    return sorted(history_items, key=lambda x: x["timestamp"], reverse=True)

@app.delete("/api/history/{item_id}")
async def delete_history_item(item_id: str):
    global history_items
    original_length = len(history_items)
    history_items = [item for item in history_items if item["id"] != item_id]
    
    if len(history_items) == original_length:
        raise HTTPException(status_code=404, detail="History item not found")
    
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    return StatusResponse(
        status="History item deleted",
        timestamp=datetime.now().isoformat(),
        uptime_seconds=uptime,
        request_count=app_state.request_count
    )

@app.delete("/api/history")
async def clear_history():
    global history_items
    items_count = len(history_items)
    history_items = []
    
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    return StatusResponse(
        status=f"History cleared ({items_count} items removed)",
        timestamp=datetime.now().isoformat(),
        uptime_seconds=uptime,
        request_count=app_state.request_count
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Ule Msee AI Assistant Backend Started")
    logger.info("📚 API docs available at http://localhost:8000/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
'''
    
    return app_code

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Ule Msee backend server...")
    
    # Create temporary app file
    app_code = create_backend_app()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(app_code)
        app_file = f.name
    
    try:
        # Set environment variables
        env = os.environ.copy()
        env["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
        
        print("🌟 Server starting on http://localhost:8000")
        print("📚 API docs will be at http://localhost:8000/docs")
        print("🔍 Health check at http://localhost:8000/health")
        print("⏹️  Press Ctrl+C to stop")
        
        # Start server
        subprocess.run([
            sys.executable, app_file
        ], env=env)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    finally:
        try:
            os.unlink(app_file)
        except:
            pass

def main():
    print("🧠 Ule Msee AI Assistant Backend")
    print("=" * 40)
    
    # Install dependencies
    if not install_packages():
        sys.exit(1)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
