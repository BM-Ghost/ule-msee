#!/usr/bin/env python3
"""
Ule Msee AI Assistant - Complete Backend in One File
Fixed version with proper Pydantic compatibility
"""

import subprocess
import sys
import os
import uuid
import time
import asyncio
import logging
from datetime import datetime
from typing import List, Optional

# If dotenv is installed, load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # if dotenv isn't installed, use OS envs

def install_dependencies():
    """Install required packages with compatible versions"""
    packages = [
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0",
        "httpx==0.25.1",
        "pydantic==2.8.2"  # Updated to compatible version
    ]
    
    print("📦 Installing compatible packages...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--quiet", 
            "--disable-pip-version-check", "--no-warn-script-location"
        ] + packages)
        print("✅ All packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False

def create_fastapi_app():
    """Create and configure the FastAPI application"""
    
    # Import after installation
    try:
        import httpx
        from fastapi import FastAPI, HTTPException, Depends, Request
        from fastapi.middleware.cors import CORSMiddleware
        from pydantic import BaseModel, Field, field_validator  # Updated import
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return None
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
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
        description="AI-powered Q&A using Groq. Ule Msee means 'wisdom' in Swahili.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
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
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
        return response
    
    # Pydantic models with V2 syntax
    class QuestionRequest(BaseModel):
        question: str = Field(..., min_length=1, max_length=2000, description="Question for Ule Msee")
        
        @field_validator('question')  # Updated to V2 syntax
        @classmethod
        def validate_question(cls, v):
            if not v or not v.strip():
                raise ValueError('Question cannot be empty')
            return v.strip()
    
    class QuestionResponse(BaseModel):
        response: str = Field(..., description="Ule Msee's response")
        model_used: str = Field(default="llama3-70b-8192", description="AI model used")
        response_time: float = Field(..., description="Response time in seconds")
    
    class HistoryItem(BaseModel):
        id: str = Field(..., description="Unique ID")
        question: str = Field(..., description="Original question")
        response: str = Field(..., description="Ule Msee's response")
        timestamp: str = Field(..., description="When asked")
        model_used: str = Field(default="llama3-70b-8192", description="AI model used")
    
    class StatusResponse(BaseModel):
        status: str = Field(..., description="Status message")
        timestamp: str = Field(..., description="Current time")
        uptime_seconds: float = Field(default=0, description="Server uptime")
        request_count: int = Field(default=0, description="Total requests")
    
    class HealthResponse(BaseModel):
        status: str = Field(..., description="Health status")
        timestamp: str = Field(..., description="Current time")
        groq_available: bool = Field(..., description="Groq API status")
        uptime_seconds: float = Field(default=0, description="Server uptime")
    
    # In-memory storage
    history_items: List[dict] = []
    
    # Groq Client
    class GroqClient:
        def __init__(self):
            # Use the API key from v0 environment
            self.api_key = os.getenv("GROQ_API_KEY")
            
            if not self.api_key.startswith("gsk_"):
                raise ValueError("Invalid GROQ_API_KEY format. Key should start with 'gsk_'")
            
            self.base_url = "https://api.groq.com/openai/v1"
            self.model = "llama3-70b-8192"
            self.fallback_model = "llama3-8b-8192"
            self.timeout = 30.0
            
            logger.info(f"🔑 Groq client initialized with key: {self.api_key[:10]}...")
        
        async def generate_response(self, question: str) -> tuple[str, str, float]:
            start_time = time.time()
            
            for attempt, model in enumerate([self.model, self.fallback_model]):
                try:
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        payload = {
                            "model": model,
                            "messages": [
                                {
                                    "role": "system", 
                                    "content": """You are Ule Msee, an AI assistant whose name means 'wisdom' in Swahili. 
                                    You provide helpful, accurate, and well-formatted answers. Use markdown formatting 
                                    when appropriate to make your responses clear and readable. Be concise but thorough."""
                                },
                                {"role": "user", "content": question}
                            ],
                            "temperature": 0.7,
                            "max_tokens": 1500,
                            "top_p": 0.9,
                        }
                        
                        logger.info(f"🤖 Asking Ule Msee (attempt {attempt + 1}, model: {model}): {question[:50]}...")
                        
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
                            if data.get("choices") and len(data["choices"]) > 0:
                                ai_response = data["choices"][0]["message"]["content"]
                                response_time = time.time() - start_time
                                logger.info(f"✅ Ule Msee responded in {response_time:.2f}s using {model}")
                                return ai_response, model, response_time
                            else:
                                raise Exception("No response choices returned from API")
                        
                        elif response.status_code == 429:
                            logger.warning(f"⚠️ Rate limit hit with {model}")
                            if attempt == 0:
                                await asyncio.sleep(1)
                                continue
                            else:
                                raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
                        
                        else:
                            error_msg = f"Groq API error: HTTP {response.status_code}"
                            try:
                                error_data = response.json()
                                if "error" in error_data:
                                    error_msg += f" - {error_data['error'].get('message', 'Unknown error')}"
                            except:
                                error_msg += f" - {response.text[:200]}"
                            
                            logger.error(f"❌ {error_msg}")
                            
                            if response.status_code == 401:
                                raise HTTPException(status_code=401, detail="Invalid API key")
                            elif response.status_code == 403:
                                raise HTTPException(status_code=403, detail="API key permission denied")
                            else:
                                if attempt == 0:
                                    continue
                                raise HTTPException(status_code=response.status_code, detail=error_msg)
                            
                except httpx.TimeoutException:
                    logger.error(f"⏰ Timeout with {model}")
                    if attempt == 0:
                        continue
                    raise HTTPException(status_code=504, detail="Ule Msee is taking too long to respond")
                
                except httpx.RequestError as e:
                    logger.error(f"🌐 Network error with {model}: {e}")
                    if attempt == 0:
                        continue
                    raise HTTPException(status_code=503, detail="Unable to connect to Ule Msee's AI service")
                
                except HTTPException:
                    raise
                
                except Exception as e:
                    logger.error(f"❌ Unexpected error with {model}: {e}")
                    if attempt == 0:
                        continue
                    raise HTTPException(status_code=500, detail="Ule Msee encountered an internal error")
            
            raise HTTPException(status_code=500, detail="All AI models failed to respond")
    
    def get_groq_client() -> GroqClient:
        if app_state.groq_client is None:
            try:
                app_state.groq_client = GroqClient()
            except ValueError as e:
                raise HTTPException(status_code=500, detail=str(e))
        return app_state.groq_client
    
    # API Routes
    @app.get("/", response_model=StatusResponse)
    async def root():
        """Root endpoint - shows server status"""
        uptime = (datetime.now() - app_state.startup_time).total_seconds()
        return StatusResponse(
            status="Ule Msee AI Assistant is running and ready to provide wisdom",
            timestamp=datetime.now().isoformat(),
            uptime_seconds=uptime,
            request_count=app_state.request_count
        )
    
    @app.get("/health", response_model=HealthResponse)
    async def health_check():
        """Health check endpoint"""
        uptime = (datetime.now() - app_state.startup_time).total_seconds()
        
        groq_available = False
        try:
            if app_state.groq_client:
                groq_available = True
            else:
                # Try to initialize to test configuration
                test_client = GroqClient()
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
    async def ask_question(request: QuestionRequest, groq_client: GroqClient = Depends(get_groq_client)):
        """Ask Ule Msee a question"""
        try:
            logger.info(f"📝 New question for Ule Msee: {request.question[:100]}...")
            
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
            
            # Keep only last 100 items
            if len(history_items) > 100:
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
            logger.error(f"❌ Error in ask_question: {e}")
            raise HTTPException(status_code=500, detail="Ule Msee encountered an internal error")
    
    @app.get("/api/history", response_model=List[HistoryItem])
    async def get_history(limit: int = 50):
        """Get question history"""
        try:
            sorted_history = sorted(history_items, key=lambda x: x["timestamp"], reverse=True)[:limit]
            logger.info(f"📚 Returning {len(sorted_history)} history items")
            return sorted_history
        except Exception as e:
            logger.error(f"❌ Error in get_history: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve history")
    
    @app.delete("/api/history/{item_id}", response_model=StatusResponse)
    async def delete_history_item(item_id: str):
        """Delete a history item"""
        try:
            nonlocal history_items
            original_length = len(history_items)
            history_items = [item for item in history_items if item["id"] != item_id]
            
            if len(history_items) == original_length:
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
        """Clear all history"""
        try:
            nonlocal history_items
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
            raise HTTPException(status_code=500, detail="Failed to clear history")
    
    # Startup and shutdown events
    @app.on_event("startup")
    async def startup_event():
        logger.info("🚀 Ule Msee AI Assistant Backend Started Successfully")
        logger.info("📚 API docs available at http://localhost:8000/docs")
        logger.info("🔍 Health check at http://localhost:8000/health")
        logger.info("🧠 Ready to provide AI-powered wisdom!")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("🛑 Ule Msee AI Assistant Backend Shutting Down")
    
    return app

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Ule Msee backend server...")
    
    if not os.getenv("GROQ_API_KEY"):
        print("❌ GROQ_API_KEY is not set. Use `.env` file or export manually.")
        sys.exit(1)
    
    # Create the FastAPI app
    app = create_fastapi_app()
    if app is None:
        print("❌ Failed to create FastAPI app")
        return False
    
    try:
        import uvicorn
        
        print("🌟 Server starting on http://localhost:8000")
        print("📚 API docs will be at http://localhost:8000/docs")
        print("🔍 Health check at http://localhost:8000/health")
        print("⏹️  Press Ctrl+C to stop the server")
        print("=" * 50)
        
        # Start the server with proper configuration
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000, 
            log_level="info",
            access_log=True,
            reload=False  # Disable reload to avoid issues
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return True
    except Exception as e:
        print(f"❌ Server error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("🧠 Ule Msee AI Assistant - Complete Backend (Fixed)")
    print("=" * 50)
    print("🌍 Starting server on all interfaces (0.0.0.0:8000)")
    print("=" * 50)
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Start server
    print("\n🎯 Dependencies installed successfully!")
    print("🚀 Starting Ule Msee backend server...")
    
    success = start_server()
    
    if success:
        print("\n✅ Ule Msee backend completed successfully!")
    else:
        print("\n❌ Ule Msee backend encountered an error")
        sys.exit(1)

if __name__ == "__main__":
    main()
