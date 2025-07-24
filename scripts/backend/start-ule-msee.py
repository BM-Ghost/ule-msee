#!/usr/bin/env python3
"""
Direct Ule Msee Backend Startup
Run this script directly to start the backend server
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

# FastAPI application code
MAIN_PY_CONTENT = '''from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List
import uuid
import os
import sys
from datetime import datetime
import httpx
import logging
import time
from contextlib import asynccontextmanager
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Global state
class AppState:
    def __init__(self):
        self.startup_time = datetime.now()
        self.request_count = 0
        self.groq_client = None

app_state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Ule Msee AI Assistant Backend")
    try:
        app_state.groq_client = GroqClient()
        logger.info("✅ Groq client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Groq client: {e}")
    yield
    logger.info("🛑 Shutting down Ule Msee AI Assistant Backend")

app = FastAPI(
    title="Ule Msee AI Assistant API",
    description="AI-powered question answering using Groq. Ule Msee means 'wisdom' in Swahili.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    app_state.request_count += 1
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
    return response

class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    
    @validator('question')
    def validate_question(cls, v):
        if not v.strip():
            raise ValueError('Question cannot be empty')
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

history_items: List[dict] = []

class GroqClient:
    def __init__(self):
        # Use the API key from v0 environment
        self.api_key = os.getenv("GROQ_API_KEY")
        
        if not self.api_key.startswith("gsk_"):
            raise ValueError("Invalid GROQ_API_KEY format")
        
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama3-70b-8192"
        self.timeout = 30.0
        
        logger.info(f"✅ Groq client initialized with model: {self.model}")
    
    async def generate_response(self, question: str) -> tuple[str, str, float]:
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are Ule Msee, an AI assistant whose name means 'wisdom' in Swahili. Provide helpful, accurate answers using markdown formatting when appropriate."
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
                    return ai_response, self.model, response_time
                else:
                    raise HTTPException(status_code=response.status_code, detail="Groq API error")
                    
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate response")

def get_groq_client() -> GroqClient:
    if app_state.groq_client is None:
        app_state.groq_client = GroqClient()
    return app_state.groq_client

@app.get("/", response_model=StatusResponse)
async def root():
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    return StatusResponse(
        status="Ule Msee AI Assistant is running and ready to provide wisdom",
        timestamp=datetime.now().isoformat(),
        uptime_seconds=uptime,
        request_count=app_state.request_count
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    
    groq_available = False
    try:
        if app_state.groq_client or GroqClient():
            groq_available = True
    except:
        pass
    
    return HealthResponse(
        status="healthy" if groq_available else "degraded",
        timestamp=datetime.now().isoformat(),
        groq_available=groq_available,
        uptime_seconds=uptime
    )

@app.post("/api/question", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest, groq_client: GroqClient = Depends(get_groq_client)):
    try:
        response_text, model_used, response_time = await groq_client.generate_response(request.question)
        
        history_item = {
            "id": str(uuid.uuid4()),
            "question": request.question,
            "response": response_text,
            "timestamp": datetime.now().isoformat(),
            "model_used": model_used
        }
        history_items.append(history_item)
        
        if len(history_items) > 100:
            history_items.pop(0)
        
        return QuestionResponse(
            response=response_text,
            model_used=model_used,
            response_time=response_time
        )
    except Exception as e:
        logger.error(f"Error in ask_question: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/history", response_model=List[HistoryItem])
async def get_history():
    return sorted(history_items, key=lambda x: x["timestamp"], reverse=True)

@app.delete("/api/history/{item_id}", response_model=StatusResponse)
async def delete_history_item(item_id: str):
    global history_items
    original_length = len(history_items)
    history_items = [item for item in history_items if item["id"] != item_id]
    
    if len(history_items) == original_length:
        raise HTTPException(status_code=404, detail="History item not found")
    
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    return StatusResponse(
        status="History item deleted successfully",
        timestamp=datetime.now().isoformat(),
        uptime_seconds=uptime,
        request_count=app_state.request_count
    )

@app.delete("/api/history", response_model=StatusResponse)
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
'''

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "fastapi==0.104.1",
            "uvicorn[standard]==0.24.0", 
            "httpx==0.25.1",
            "pydantic==2.5.3"
        ], check=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def main():
    print("🧠 Starting Ule Msee AI Assistant Backend")
    print("=" * 40)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Create temporary main.py file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(MAIN_PY_CONTENT)
        temp_main = f.name
    
    try:
        print("🚀 Starting server on http://localhost:8000")
        print("📚 API docs will be available at http://localhost:8000/docs")
        
        # Set environment variable for API key
        env = os.environ.copy()
        env["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
        
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", f"{Path(temp_main).stem}:app",
            "--reload", "--host", "0.0.0.0", "--port", "8000"
        ], env=env, cwd=Path(temp_main).parent)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    finally:
        # Clean up temporary file
        try:
            os.unlink(temp_main)
        except:
            pass

if __name__ == "__main__":
    main()
