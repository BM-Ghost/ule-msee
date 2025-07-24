from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import os
from datetime import datetime
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="AI Q&A API",
    description="API for AI-powered question answering using Groq",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

class QuestionResponse(BaseModel):
    response: str

class HistoryItem(BaseModel):
    id: str
    question: str
    response: str
    timestamp: str

# In-memory storage for history (replace with database in production)
history_items = []

# Groq API client
class GroqClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama3-70b-8192"  # Default model
    
    async def generate_response(self, question: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful AI assistant that provides accurate, concise, and informative answers."},
                        {"role": "user", "content": question}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1000
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error from Groq API")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]

# Dependency
def get_groq_client():
    try:
        return GroqClient()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Routes
@app.post("/api/question", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest, groq_client: GroqClient = Depends(get_groq_client)):
    try:
        response_text = await groq_client.generate_response(request.question)
        
        # Save to history
        history_item = {
            "id": str(uuid.uuid4()),
            "question": request.question,
            "response": response_text,
            "timestamp": datetime.now().isoformat()
        }
        history_items.append(history_item)
        
        # Keep only the last 50 items
        if len(history_items) > 50:
            history_items.pop(0)
        
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history", response_model=List[HistoryItem])
async def get_history():
    return sorted(history_items, key=lambda x: x["timestamp"], reverse=True)

@app.delete("/api/history/{item_id}")
async def delete_history_item(item_id: str):
    global history_items
    original_length = len(history_items)
    history_items = [item for item in history_items if item["id"] != item_id]
    
    if len(history_items) == original_length:
        raise HTTPException(status_code=404, detail="History item not found")
    
    return {"status": "success"}

@app.delete("/api/history")
async def clear_history():
    global history_items
    history_items = []
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
