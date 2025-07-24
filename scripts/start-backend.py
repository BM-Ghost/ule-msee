#!/usr/bin/env python3
"""
Ule Msee Backend Startup Script for v0
This script starts the Ule Msee AI Assistant backend server in the v0 environment
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def log(message, color="reset"):
    colors = {
        "reset": "\033[0m",
        "red": "\033[31m",
        "green": "\033[32m",
        "yellow": "\033[33m",
        "blue": "\033[34m",
        "cyan": "\033[36m",
        "magenta": "\033[35m",
    }
    print(f"{colors.get(color, colors['reset'])}{message}{colors['reset']}")

def check_requirements():
    """Check if all requirements are met"""
    log("🔍 Checking requirements...", "blue")
    
    # Check if we're in the right directory
    backend_dir = Path("backend")
    if not backend_dir.exists():
        log("❌ Backend directory not found", "red")
        log("💡 Run the setup script first", "yellow")
        return False
    
    # Check if main.py exists
    main_py = backend_dir / "main.py"
    if not main_py.exists():
        log("❌ main.py not found", "red")
        log("💡 Run the setup script first", "yellow")
        return False
    
    # Check if .env file exists
    env_file = backend_dir / ".env"
    if not env_file.exists():
        log("❌ .env file not found", "red")
        log("💡 Run the setup script first", "yellow")
        return False
    
    log("✅ Requirements check passed", "green")
    return True

def install_dependencies():
    """Install Python dependencies"""
    log("📦 Installing dependencies...", "blue")
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "fastapi==0.104.1",
            "uvicorn[standard]==0.24.0", 
            "httpx==0.25.1",
            "python-dotenv==1.0.0",
            "pydantic==2.5.3",
            "python-multipart==0.0.6"
        ], check=True, capture_output=True, text=True)
        log("✅ Dependencies installed successfully", "green")
        return True
    except subprocess.CalledProcessError as e:
        log(f"❌ Failed to install dependencies: {e}", "red")
        return False

def start_server():
    """Start the FastAPI server"""
    log("🚀 Starting Ule Msee backend server...", "magenta")
    
    # Change to backend directory
    os.chdir("backend")
    
    try:
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", "main:app", 
            "--reload", "--host", "0.0.0.0", "--port", "8000"
        ])
    except KeyboardInterrupt:
        log("\n🛑 Server stopped by user", "yellow")
    except Exception as e:
        log(f"❌ Failed to start server: {e}", "red")

def main():
    log("🧠 Ule Msee AI Assistant Backend Startup", "cyan")
    log("=" * 40, "cyan")
    
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
