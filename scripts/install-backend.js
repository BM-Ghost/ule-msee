const { spawn, exec } = require("child_process")
const fs = require("fs")
const path = require("path")

const BACKEND_DIR = path.join(__dirname, "..", "backend")

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
}

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function ensureBackendStructure() {
  // Create backend directory if it doesn't exist
  if (!fs.existsSync(BACKEND_DIR)) {
    fs.mkdirSync(BACKEND_DIR, { recursive: true })
    log("📁 Created backend directory", "blue")
  }

  // Create requirements file
  const requirementsContent = `fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
python-dotenv==1.0.0
pydantic==2.5.3
python-multipart==0.0.6`

  const requirementsPath = path.join(BACKEND_DIR, "requirements.txt")
  fs.writeFileSync(requirementsPath, requirementsContent)
  log("📝 Created requirements.txt", "green")

  // Create .env file if it doesn't exist
  const envPath = path.join(BACKEND_DIR, ".env")
  if (!fs.existsSync(envPath)) {
    const envContent = `# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Server Configuration
PORT=8000
ENVIRONMENT=development

# Optional: Set log level
LOG_LEVEL=INFO`

    fs.writeFileSync(envPath, envContent)
    log("📝 Created .env file", "yellow")
  }

  // Create .env.example file
  const envExamplePath = path.join(BACKEND_DIR, ".env.example")
  const envExampleContent = `# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Server Configuration
PORT=8000
ENVIRONMENT=development

# Optional: Set log level
LOG_LEVEL=INFO`

  fs.writeFileSync(envExamplePath, envExampleContent)
  log("📝 Created .env.example file", "green")

  // Create main.py if it doesn't exist
  const mainPyPath = path.join(BACKEND_DIR, "main.py")
  if (!fs.existsSync(mainPyPath)) {
    const mainPyContent = `from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List
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
    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
    
    return response

# Pydantic models
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

# In-memory storage
history_items: List[dict] = []

# Groq client
class GroqClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key or self.api_key == "your_groq_api_key_here":
            raise ValueError("GROQ_API_KEY not set or using placeholder value")
        
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
                    return ai_response, self.model, response_time
                else:
                    raise HTTPException(status_code=response.status_code, detail="Groq API error")
                    
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate response")

def get_groq_client() -> GroqClient:
    if app_state.groq_client is None:
        try:
            app_state.groq_client = GroqClient()
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
    return app_state.groq_client

# Routes
@app.get("/", response_model=StatusResponse)
async def root():
    uptime = (datetime.now() - app_state.startup_time).total_seconds()
    return StatusResponse(
        status="Ule Msee AI Assistant is running",
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
        
        return QuestionResponse(
            response=response_text,
            model_used=model_used,
            response_time=response_time
        )
    except HTTPException:
        raise
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
        status="History item deleted",
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
`

    fs.writeFileSync(mainPyPath, mainPyContent)
    log("📝 Created main.py", "green")
  }
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
    log("📦 Installing backend dependencies...", "blue")

    const installProcess = spawn(pythonCmd, ["-m", "pip", "install", "-r", "requirements.txt"], {
      cwd: BACKEND_DIR,
      stdio: "inherit",
      shell: true,
    })

    installProcess.on("close", (code) => {
      if (code === 0) {
        log("✅ Backend dependencies installed successfully", "green")
        resolve()
      } else {
        log("❌ Failed to install backend dependencies", "red")
        reject(new Error(`Installation failed with code ${code}`))
      }
    })

    installProcess.on("error", (error) => {
      log(`❌ Installation error: ${error.message}`, "red")
      reject(error)
    })
  })
}

async function main() {
  try {
    log("🔧 Setting up Ule Msee backend dependencies...", "bright")

    // Ensure backend structure exists
    ensureBackendStructure()

    // Check Python installation
    const pythonCmd = await checkPythonInstallation()
    if (!pythonCmd) {
      log("❌ Python not found! Please install Python 3.8+ from https://python.org", "red")
      process.exit(1)
    }

    // Install dependencies
    await installDependencies(pythonCmd)

    log("🎉 Backend setup complete!", "green")
    log('💡 Run "npm run dev" to start both frontend and backend', "cyan")
  } catch (error) {
    log(`❌ Setup error: ${error.message}`, "red")
    process.exit(1)
  }
}

main()
