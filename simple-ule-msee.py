#!/usr/bin/env python3
"""
Ultra-Simple Ule Msee Backend - Minimal Dependencies
This version uses only the most basic requirements to avoid conflicts
"""

import subprocess
import sys
import os
import json
import uuid
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import asyncio

def install_minimal_deps():
    """Install only essential packages"""
    packages = ["httpx==0.25.1"]
    
    print("📦 Installing minimal dependencies...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--quiet", 
            "--disable-pip-version-check", "--no-warn-script-location"
        ] + packages)
        print("✅ Minimal packages installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False

class GroqClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama3-70b-8192"
        print(f"🔑 Groq client initialized with key: {self.api_key[:10]}...")
    
    async def generate_response(self, question: str):
        import httpx
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
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
                    return data["choices"][0]["message"]["content"]
                else:
                    raise Exception(f"API error: {response.status_code}")
                    
        except Exception as e:
            raise Exception(f"Failed to generate response: {e}")

# Global state
groq_client = None
history_items = []
startup_time = datetime.now()
request_count = 0

class HekimaHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        global request_count, startup_time, history_items, groq_client
        request_count += 1
        
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        if path == '/':
            # Root endpoint
            uptime = (datetime.now() - startup_time).total_seconds()
            response = {
                "status": "Ule Msee AI Assistant is running and ready to provide wisdom",
                "timestamp": datetime.now().isoformat(),
                "uptime_seconds": uptime,
                "request_count": request_count
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/health':
            # Health check
            uptime = (datetime.now() - startup_time).total_seconds()
            groq_available = groq_client is not None
            
            response = {
                "status": "healthy" if groq_available else "degraded",
                "timestamp": datetime.now().isoformat(),
                "groq_available": groq_available,
                "uptime_seconds": uptime
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/api/history':
            # Get history
            sorted_history = sorted(history_items, key=lambda x: x["timestamp"], reverse=True)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(sorted_history).encode())
            
        elif path == '/docs':
            # Simple API docs
            docs_html = """
            <!DOCTYPE html>
            <html>
            <head><title>Ule Msee API Docs</title></head>
            <body>
                <h1>🧠 Ule Msee AI Assistant API</h1>
                <h2>Endpoints:</h2>
                <ul>
                    <li><strong>GET /</strong> - Server status</li>
                    <li><strong>GET /health</strong> - Health check</li>
                    <li><strong>POST /api/question</strong> - Ask a question</li>
                    <li><strong>GET /api/history</strong> - Get question history</li>
                    <li><strong>DELETE /api/history</strong> - Clear history</li>
                </ul>
                <h2>Example Question Request:</h2>
                <pre>POST /api/question
Content-Type: application/json

{"question": "What is artificial intelligence?"}</pre>
            </body>
            </html>
            """
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(docs_html.encode())
            
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        global groq_client, history_items
        
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        if self.path == '/api/question':
            try:
                # Read request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                question = data.get('question', '').strip()
                if not question:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Question cannot be empty"}).encode())
                    return
                
                print(f"📝 Question: {question[:50]}...")
                
                # Generate response using asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                start_time = time.time()
                ai_response = loop.run_until_complete(groq_client.generate_response(question))
                response_time = time.time() - start_time
                
                print(f"✅ Response generated in {response_time:.2f}s")
                
                # Save to history
                history_item = {
                    "id": str(uuid.uuid4()),
                    "question": question,
                    "response": ai_response,
                    "timestamp": datetime.now().isoformat(),
                    "model_used": "llama3-70b-8192"
                }
                history_items.append(history_item)
                
                # Keep only last 50 items
                if len(history_items) > 50:
                    history_items.pop(0)
                
                response = {
                    "response": ai_response,
                    "model_used": "llama3-70b-8192",
                    "response_time": response_time
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                print(f"❌ Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_DELETE(self):
        """Handle DELETE requests"""
        global history_items
        
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        if self.path == '/api/history':
            items_count = len(history_items)
            history_items = []
            
            response = {
                "status": f"History cleared ({items_count} items removed)",
                "timestamp": datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"🌐 {self.address_string()} - {format % args}")

def start_simple_server():
    """Start the simple HTTP server"""
    global groq_client
    
    print("🚀 Starting simple Ule Msee server...")
    
    # Set environment
    os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
    
    # Initialize Groq client
    try:
        groq_client = GroqClient()
        print("✅ Groq client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Groq client: {e}")
        return False
    
    # Start server
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, HekimaHandler)
    
    print("🌟 Server running on http://localhost:8000")
    print("📚 API docs at http://localhost:8000/docs")
    print("🔍 Health check at http://localhost:8000/health")
    print("⏹️  Press Ctrl+C to stop")
    print("=" * 50)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        httpd.shutdown()
        return True
    except Exception as e:
        print(f"❌ Server error: {e}")
        return False

def main():
    """Main function"""
    print("🧠 Ule Msee AI Assistant - Simple Backend")
    print("=" * 50)
    print("🔧 Using minimal dependencies to avoid conflicts")
    print("🔑 Using Groq API Key from v0 integration")
    print("🌍 Starting server on http://localhost:8000")
    print("=" * 50)
    
    # Install minimal dependencies
    if not install_minimal_deps():
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Start server
    print("\n🎯 Dependencies installed successfully!")
    
    success = start_simple_server()
    
    if success:
        print("\n✅ Ule Msee backend completed successfully!")
    else:
        print("\n❌ Ule Msee backend encountered an error")
        sys.exit(1)

if __name__ == "__main__":
    main()
