from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
import os
from datetime import datetime
import httpx
from dotenv import load_dotenv
import logging
import time
from contextlib import asynccontextmanager
import asyncio

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global state for graceful shutdown
class AppState:
    def __init__(self):
        self.startup_time = datetime.now()
        self.request_count = 0
        self.groq_client = None

app_state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Ule Msee AI Assistant Backend")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    # Initialize Groq client
    try:
        app_state.groq_client = GroqClient()
        logger.info("✅ Groq client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Groq client: {e}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Ule Msee AI Assistant Backend")

app = FastAPI(
    title="Ule Msee AI Assistant API",
    description="AI-powered question answering using Groq's lightning-fast models. Ule Msee means 'wisdom' in Swahili.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Allow all hosts for development
)

# CORS middleware with development settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    app_state.request_count += 1
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    return response

# Pydantic models
class QuestionRequest(BaseModel):
    question: str = Field(
        ..., 
        min_length=1, 
        max_length=2000, 
        description="The question to ask Ule Msee"
    )
    
    @validator('question')
    def validate_question(cls, v):
        if not v.strip():
            raise ValueError('Question cannot be empty or just whitespace')
        return v.strip()

class QuestionResponse(BaseModel):
    response: str = Field(..., description="Ule Msee's AI-powered response")
    model_used: str = Field(..., description="The AI model used for the response")
    response_time: float = Field(..., description="Response time in seconds")

class HistoryItem(BaseModel):
    id: str = Field(..., description="Unique identifier for the history item")
    question: str = Field(..., description="The original question")
    response: str = Field(..., description="Ule Msee's response")
    timestamp: str = Field(..., description="ISO timestamp when the question was asked")
    model_used: str = Field(default="llama3-70b-8192", description="The AI model used")

class StatusResponse(BaseModel):
    status: str = Field(..., description="Status message")
    timestamp: str = Field(..., description="Current timestamp")
    uptime_seconds: float = Field(..., description="Server uptime in seconds")
    request_count: int = Field(..., description="Total requests processed")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Health status")
    timestamp: str = Field(..., description="Current timestamp")
    groq_available: bool = Field(..., description="Whether Groq API is available")
    uptime_seconds: float = Field(..., description="Server uptime in seconds")

# In-memory storage
MAX_HISTORY_ITEMS = 1000
history_items: List[dict] = []

# Groq client
class GroqClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key or self.api_key == "your_groq_api_key_here":
            raise ValueError("GROQ_API_KEY environment variable is not set or is using placeholder value")
        
        if not self.api_key.startswith("gsk_"):
            raise ValueError("Invalid GROQ_API_KEY format (should start with 'gsk_')")
        
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama3-70b-8192"
        self.fallback_model = "llama3-8b-8192"
        self.timeout = 30.0
        self.max_retries = 3
        
        logger.info(f"✅ Initialized Groq client with primary model: {self.model}")
    
    async def generate_response(self, question: str) -> tuple[str, str, float]:
        """Generate a response using Groq AI"""
        start_time = time.time()
        
        for attempt in range(self.max_retries):
            try:
                model_to_use = self.model if attempt < 2 else self.fallback_model
                
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    payload = {
                        "model": model_to_use,
                        "messages": [
                            {
                                "role": "system", 
                                "content": """You are Ule Msee, an AI assistant whose name means 'wisdom' in Swahili. 
                                You provide accurate, thoughtful, and well-researched answers. Format your responses 
                                using markdown when appropriate for better readability. Be concise but comprehensive, 
                                and always strive to be helpful and informative."""
                            },
                            {
                                "role": "user", 
                                "content": question
                            }
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1500,
                        "top_p": 0.9,
                        "stream": False
                    }
                    
                    logger.info(f"🤖 Asking Ule Msee (attempt {attempt + 1}): {question[:50]}...")
                    
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
                        
                        if not data.get("choices") or len(data["choices"]) == 0:
                            raise HTTPException(status_code=500, detail="Ule Msee couldn't generate a response")
                        
                        ai_response = data["choices"][0]["message"]["content"]
                        response_time = time.time() - start_time
                        
                        logger.info(f"✅ Ule Msee responded successfully in {response_time:.2f}s using {model_to_use}")
                        
                        return ai_response, model_to_use, response_time
                    
                    elif response.status_code == 429:
                        logger.warning(f"⚠️ Rate limit hit on attempt {attempt + 1}")
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                    
                    else:
                        error_detail = f"Groq API error: {response.status_code}"
                        try:
                            error_data = response.json()
                            error_detail += f" - {error_data.get('error', {}).get('message', 'Unknown error')}"
                        except:
                            error_detail += f" - {response.text}"
                        
                        logger.error(f"❌ {error_detail}")
                        
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        
                        raise HTTPException(status_code=response.status_code, detail=error_detail)
                        
            except httpx.TimeoutException:
                logger.error(f"⏰ Timeout on attempt {attempt + 1}")
                if attempt < self.max_retries - 1:
                    continue
                raise HTTPException(status_code=504, detail="Ule Msee is taking too long to respond. Please try again.")
            
            except httpx.RequestError as e:
                logger.error(f"🌐 Network error on attempt {attempt + 1}: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise HTTPException(status_code=503, detail="Unable to connect to Ule Msee's AI service")
        
        raise HTTPException(status_code=500, detail="Ule Msee is temporarily unavailable after multiple attempts")

# Dependency injection
def get_groq_client() -> GroqClient:
    if app_state.groq_client is None:
        try:
            app_state.groq_client = GroqClient()
        except ValueError as e:
            logger.error(f"❌ Failed to initialize Groq client: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app_state.groq_client

# API Routes
@app.get("/", response_model=StatusResponse)
async def root():
    """Root endpoint with server status"""
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    
    return StatusResponse(
        status="Ule Msee AI Assistant is running and ready to provide wisdom",
        timestamp=datetime.now().isoformat(),
        uptime_seconds=uptime,
        request_count=app_state.request_count
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Comprehensive health check endpoint"""
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    
    # Test Groq availability
    groq_available = False
    try:
        if app_state.groq_client:
            groq_available = True
        else:
            GroqClient()
            groq_available = True
    except Exception as e:
        logger.warning(f"⚠️ Groq health check failed: {e}")
        groq_available = False
    
    return HealthResponse(
        status="healthy" if groq_available else "degraded",
        timestamp=datetime.now().isoformat(),
        groq_available=groq_available,
        uptime_seconds=uptime
    )

@app.post("/api/question", response_model=QuestionResponse)
async def ask_question(
    request: QuestionRequest, 
    groq_client: GroqClient = Depends(get_groq_client)
):
    """Submit a question to Ule Msee and get an AI-powered response"""
    try:
        logger.info(f"📝 New question for Ule Msee: {request.question[:100]}...")
        
        # Generate AI response
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
        
        # Keep history within limits
        if len(history_items) > MAX_HISTORY_ITEMS:
            history_items.pop(0)
        
        logger.info(f"💾 Saved to history. Total items: {len(history_items)}")
        
        return QuestionResponse(
            response=response_text,
            model_used=model_used,
            response_time=response_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in ask_question: {e}")
        raise HTTPException(status_code=500, detail="Ule Msee encountered an internal error")

@app.get("/api/history", response_model=List[HistoryItem])
async def get_history(limit: int = 50):
    """Get Ule Msee's question and answer history"""
    try:
        sorted_history = sorted(
            history_items, 
            key=lambda x: x["timestamp"], 
            reverse=True
        )[:limit]
        
        logger.info(f"📚 Returning {len(sorted_history)} history items")
        return sorted_history
        
    except Exception as e:
        logger.error(f"❌ Error in get_history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve Ule Msee's history")

@app.delete("/api/history/{item_id}", response_model=StatusResponse)
async def delete_history_item(item_id: str):
    """Delete a specific history item"""
    try:
        global history_items
        original_length = len(history_items)
        
        history_items = [item for item in history_items if item["id"] != item_id]
        
        if len(history_items) == original_length:
            logger.warning(f"⚠️ History item not found: {item_id}")
            raise HTTPException(status_code=404, detail="History item not found")
        
        logger.info(f"🗑️ Deleted history item: {item_id}")
        
        uptime = (datetime.now() - app_state.startup_time).total_seconds()
        return StatusResponse(
            status="History item deleted successfully",
            timestamp=datetime.now().isoformat(),
            uptime_seconds=uptime,
            request_count=app_state.request_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in delete_history_item: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete history item")

@app.delete("/api/history", response_model=StatusResponse)
async def clear_history():
    """Clear all of Ule Msee's history"""
    try:
        global history_items
        items_count = len(history_items)
        history_items = []
        
        logger.info(f"🧹 Cleared {items_count} history items")
        
        uptime = (datetime.now() - app_state.startup_time).total_seconds()
        return StatusResponse(
            status=f"Ule Msee's history cleared successfully ({items_count} items removed)",
            timestamp=datetime.now().isoformat(),
            uptime_seconds=uptime,
            request_count=app_state.request_count
        )
        
    except Exception as e:
        logger.error(f"❌ Error in clear_history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear Ule Msee's history")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    environment = os.getenv("ENVIRONMENT", "development")
    
    logger.info(f"🚀 Starting Ule Msee on port {port} in {environment} mode")
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=environment == "development",
        log_level="info",
        access_log=True
    )
