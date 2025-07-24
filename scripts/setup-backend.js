const { spawn, exec } = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

// Get the correct project root directory
const PROJECT_ROOT = path.resolve(__dirname, "..")
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend")

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
}

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkPermissions() {
  try {
    // Check if we can write to the project directory
    const testFile = path.join(PROJECT_ROOT, ".permission-test")
    fs.writeFileSync(testFile, "test")
    fs.unlinkSync(testFile)
    return true
  } catch (error) {
    log(`❌ Permission error: ${error.message}`, "red")
    log("💡 Try running the command as administrator or check folder permissions", "yellow")
    return false
  }
}

function ensureBackendStructure() {
  try {
    log(`📁 Creating backend directory at: ${BACKEND_DIR}`, "blue")

    // Create backend directory with proper permissions
    if (!fs.existsSync(BACKEND_DIR)) {
      fs.mkdirSync(BACKEND_DIR, { recursive: true, mode: 0o755 })
      log("✅ Backend directory created successfully", "green")
    } else {
      log("✅ Backend directory already exists", "green")
    }

    // Create requirements.txt
    const requirementsContent = `fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
python-dotenv==1.0.0
pydantic==2.5.3
python-multipart==0.0.6`

    const requirementsPath = path.join(BACKEND_DIR, "requirements.txt")
    fs.writeFileSync(requirementsPath, requirementsContent, { mode: 0o644 })
    log("✅ Created requirements.txt", "green")

    // Create .env file
    const envPath = path.join(BACKEND_DIR, ".env")
    const envContent = `# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Server Configuration
PORT=8000
ENVIRONMENT=development

# Optional: Set log level
LOG_LEVEL=INFO`

    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envContent, { mode: 0o644 })
      log("✅ Created .env file", "green")
    } else {
      log("✅ .env file already exists", "green")
    }

    // Create .env.example
    const envExamplePath = path.join(BACKEND_DIR, ".env.example")
    fs.writeFileSync(envExamplePath, envContent, { mode: 0o644 })
    log("✅ Created .env.example", "green")

    // Create main.py
    createMainPy()

    // Create startup script
    createStartupScript()

    return true
  } catch (error) {
    log(`❌ Error creating backend structure: ${error.message}`, "red")

    if (error.code === "EACCES") {
      log("💡 Permission denied. Try one of these solutions:", "yellow")
      log("   1. Run your terminal/command prompt as administrator", "yellow")
      log("   2. Change to a directory you have write access to", "yellow")
      log("   3. Check the folder permissions", "yellow")
    }

    return false
  }
}

function createMainPy() {
  const mainPyPath = path.join(BACKEND_DIR, "main.py")
  const mainPyContent = `from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List
import uuid
import os
import sys
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
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("ule-msee.log") if os.access(".", os.W_OK) else logging.StreamHandler(sys.stdout)
    ]
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
    # Startup
    logger.info("🚀 Starting Ule Msee AI Assistant Backend")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")
    
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
    description="AI-powered question answering using Groq. Ule Msee means 'wisdom' in Swahili.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware - Allow all origins for development
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
    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
    
    return response

# Pydantic models
class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="Question for Ule Msee")
    
    @validator('question')
    def validate_question(cls, v):
        if not v.strip():
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

# Groq client
class GroqClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable not found. Please check your .env file.")
        
        if self.api_key == "your_groq_api_key_here":
            raise ValueError("Please replace the placeholder GROQ_API_KEY in your .env file with your actual API key from console.groq.com")
        
        if not self.api_key.startswith("gsk_"):
            raise ValueError("Invalid GROQ_API_KEY format. The key should start with 'gsk_'. Please check your API key.")
        
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama3-70b-8192"
        self.fallback_model = "llama3-8b-8192"
        self.timeout = 30.0
        
        logger.info(f"✅ Groq client initialized with model: {self.model}")
    
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
                            logger.info(f"✅ Ule Msee responded successfully in {response_time:.2f}s using {model}")
                            return ai_response, model, response_time
                        else:
                            raise Exception("No response choices returned from API")
                    
                    elif response.status_code == 429:
                        logger.warning(f"⚠️ Rate limit hit with {model}, trying fallback...")
                        if attempt == 0:  # Try fallback model
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
                            raise HTTPException(status_code=401, detail="Invalid API key. Please check your GROQ_API_KEY in the .env file.")
                        elif response.status_code == 403:
                            raise HTTPException(status_code=403, detail="API key doesn't have permission. Please check your Groq account.")
                        else:
                            raise HTTPException(status_code=response.status_code, detail=error_msg)
                        
            except httpx.TimeoutException:
                logger.error(f"⏰ Timeout with {model}")
                if attempt == 0:
                    continue
                raise HTTPException(status_code=504, detail="Ule Msee is taking too long to respond. Please try again.")
            
            except httpx.RequestError as e:
                logger.error(f"🌐 Network error with {model}: {e}")
                if attempt == 0:
                    continue
                raise HTTPException(status_code=503, detail="Unable to connect to Ule Msee's AI service. Please check your internet connection.")
            
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
        global history_items
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
        raise HTTPException(status_code=500, detail="Failed to clear history")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Ule Msee encountered an unexpected error"}
    )

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = "0.0.0.0"
    
    logger.info(f"🚀 Starting Ule Msee on {host}:{port}")
    logger.info(f"📚 API docs will be available at http://localhost:{port}/docs")
    
    try:
        uvicorn.run(
            "main:app", 
            host=host, 
            port=port, 
            reload=True, 
            log_level="info",
            access_log=True
        )
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)
`

  fs.writeFileSync(mainPyPath, mainPyContent, { mode: 0o644 })
  log("✅ Created main.py with complete FastAPI application", "green")
}

function createStartupScript() {
  const startScriptContent = `#!/usr/bin/env python3
"""
Ule Msee Backend Startup Script
This script starts the Ule Msee AI Assistant backend server
"""

import os
import sys
import subprocess
from pathlib import Path

def check_requirements():
    """Check if all requirements are met"""
    print("🔍 Checking requirements...")
    
    # Check if .env file exists
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    # Check if API key is configured
    with open(env_file, 'r') as f:
        env_content = f.read()
    
    if "GROQ_API_KEY=your_groq_api_key_here" in env_content:
        print("❌ GROQ_API_KEY is not configured")
        print("   Please edit .env and add your API key from console.groq.com")
        return False
    
    if "GROQ_API_KEY=gsk_" not in env_content:
        print("❌ GROQ_API_KEY is not properly configured")
        print("   Please edit .env and add your API key from console.groq.com")
        return False
    
    print("✅ Requirements check passed")
    return True

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True, text=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        print("💡 Try running: python -m pip install --upgrade pip")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Ule Msee backend server...")
    try:
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", 
                       "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

def main():
    print("🧠 Ule Msee AI Assistant Backend Startup")
    print("=" * 40)
    
    # Change to script directory
    os.chdir(Path(__file__).parent)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
`

  const startScriptPath = path.join(BACKEND_DIR, "start.py")
  fs.writeFileSync(startScriptPath, startScriptContent, { mode: 0o755 })
  log("✅ Created start.py script", "green")
}

function checkPythonInstallation() {
  return new Promise((resolve) => {
    const pythonCommands = ["python", "python3", "py"]

    const checkNext = (index) => {
      if (index >= pythonCommands.length) {
        resolve(null)
        return
      }

      const cmd = pythonCommands[index]
      exec(`${cmd} --version`, (error, stdout) => {
        if (!error && stdout.includes("Python")) {
          const version = stdout.trim()
          log(`✅ Found ${version} using command: ${cmd}`, "green")
          resolve(cmd)
        } else {
          checkNext(index + 1)
        }
      })
    }

    checkNext(0)
  })
}

async function installDependencies(pythonCmd) {
  return new Promise((resolve, reject) => {
    log("📦 Installing Python dependencies...", "blue")

    const installProcess = spawn(pythonCmd, ["-m", "pip", "install", "-r", "requirements.txt"], {
      cwd: BACKEND_DIR,
      stdio: "inherit",
      shell: true,
    })

    installProcess.on("close", (code) => {
      if (code === 0) {
        log("✅ Python dependencies installed successfully", "green")
        resolve()
      } else {
        log("❌ Failed to install Python dependencies", "red")
        log("💡 Try running: python -m pip install --upgrade pip", "yellow")
        reject(new Error(`Installation failed with code ${code}`))
      }
    })

    installProcess.on("error", (error) => {
      log(`❌ Installation error: ${error.message}`, "red")
      reject(error)
    })
  })
}

async function testBackendConnection() {
  return new Promise((resolve) => {
    log("🔍 Testing backend connection...", "blue")

    // Give it a moment then test
    setTimeout(async () => {
      try {
        const { default: fetch } = await import("node-fetch")
        const response = await fetch("http://localhost:8000/health", { timeout: 5000 })
        if (response.ok) {
          log("✅ Backend is accessible on http://localhost:8000", "green")
          resolve(true)
        } else {
          log("⚠️ Backend responded but with error status", "yellow")
          resolve(false)
        }
      } catch (error) {
        log("⚠️ Backend connection test failed (this is normal if not started yet)", "yellow")
        resolve(false)
      }
    }, 2000)
  })
}

async function main() {
  try {
    log("🧠 Setting up Ule Msee AI Assistant Backend...", "bright")
    log(`📍 Project root: ${PROJECT_ROOT}`, "blue")
    log(`📍 Backend directory: ${BACKEND_DIR}`, "blue")

    // Check permissions first
    if (!checkPermissions()) {
      process.exit(1)
    }

    // Ensure backend structure exists
    log("🔧 Creating backend structure...", "blue")
    if (!ensureBackendStructure()) {
      process.exit(1)
    }

    // Check Python installation
    log("🐍 Checking Python installation...", "blue")
    const pythonCmd = await checkPythonInstallation()
    if (!pythonCmd) {
      log("❌ Python not found! Please install Python 3.8+ from https://python.org", "red")
      log("💡 Make sure to check 'Add Python to PATH' during installation", "yellow")
      process.exit(1)
    }

    // Install Python dependencies
    await installDependencies(pythonCmd)

    // Test connection (optional)
    await testBackendConnection()

    log("", "reset")
    log("🎉 Backend setup complete!", "green")
    log("", "reset")
    log("📝 Next steps:", "bright")
    log("1. Edit backend/.env and add your GROQ_API_KEY", "cyan")
    log("   Get a free API key at: https://console.groq.com/", "cyan")
    log("   Replace 'your_groq_api_key_here' with your actual key", "cyan")
    log("", "reset")
    log("2. Start the backend:", "cyan")
    log("   Option A: pnpm run dev (starts both frontend and backend)", "cyan")
    log("   Option B: cd backend && python start.py (backend only)", "cyan")
    log("   Option C: cd backend && python -m uvicorn main:app --reload", "cyan")
    log("", "reset")
    log("🌟 Your API key should look like: GROQ_API_KEY=gsk_...", "yellow")
    log("📚 Once running, API docs will be at: http://localhost:8000/docs", "cyan")
  } catch (error) {
    log(`❌ Setup error: ${error.message}`, "red")
    log("", "reset")
    log("💡 Troubleshooting tips:", "yellow")
    log("- Make sure you have write permissions to this directory", "yellow")
    log("- Try running your terminal as administrator", "yellow")
    log("- Make sure Python 3.8+ is installed and in PATH", "yellow")
    log("- Check that you have internet connection for pip installs", "yellow")
    process.exit(1)
  }
}

main()
