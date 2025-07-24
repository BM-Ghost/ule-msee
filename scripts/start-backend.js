const { spawn, exec } = require("child_process")
const fs = require("fs")
const path = require("path")

const PROJECT_ROOT = path.resolve(__dirname, "..")
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend")
const ENV_FILE = path.join(BACKEND_DIR, ".env")

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
}

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
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
          resolve(cmd)
        } else {
          checkNext(index + 1)
        }
      })
    }

    checkNext(0)
  })
}

function checkBackendSetup() {
  // Check if backend directory exists
  if (!fs.existsSync(BACKEND_DIR)) {
    log("❌ Backend directory not found!", "red")
    log("💡 Run 'pnpm run backend:install' first to set up the backend", "yellow")
    return false
  }

  // Check if main.py exists
  const mainPyPath = path.join(BACKEND_DIR, "main.py")
  if (!fs.existsSync(mainPyPath)) {
    log("❌ main.py not found in backend directory", "red")
    log("💡 Run 'pnpm run backend:install' first to set up the backend", "yellow")
    return false
  }

  // Check if .env file exists
  if (!fs.existsSync(ENV_FILE)) {
    log("❌ .env file not found in backend directory", "red")
    log("💡 Run 'pnpm run backend:install' first to set up the backend", "yellow")
    return false
  }

  return true
}

function checkEnvConfiguration() {
  try {
    const envContent = fs.readFileSync(ENV_FILE, "utf8")

    if (envContent.includes("GROQ_API_KEY=your_groq_api_key_here")) {
      log("⚠️  GROQ_API_KEY is still using placeholder value", "yellow")
      log("   Please edit backend/.env and add your actual Groq API key", "yellow")
      log("   Get a free key at: https://console.groq.com/", "cyan")
      log("   Replace 'your_groq_api_key_here' with your actual key", "cyan")
      return false
    }

    if (!envContent.includes("GROQ_API_KEY=gsk_")) {
      log("⚠️  GROQ_API_KEY not properly configured in backend/.env", "yellow")
      log("   Please add your Groq API key to backend/.env", "yellow")
      log("   Get a free key at: https://console.groq.com/", "cyan")
      log("   Format: GROQ_API_KEY=gsk_your_key_here", "cyan")
      return false
    }

    return true
  } catch (error) {
    log(`❌ Error reading .env file: ${error.message}`, "red")
    return false
  }
}

async function checkPort8000() {
  return new Promise((resolve) => {
    const { exec } = require("child_process")

    // Check if port 8000 is already in use
    const command = process.platform === "win32" ? "netstat -an | findstr :8000" : "lsof -i :8000"

    exec(command, (error, stdout) => {
      if (stdout && stdout.trim()) {
        log("⚠️  Port 8000 appears to be in use", "yellow")
        log("   If Ule Msee backend is already running, you can skip this step", "yellow")
        log("   Otherwise, stop the process using port 8000", "yellow")
      }
      resolve()
    })
  })
}

async function startBackend(pythonCmd) {
  return new Promise((resolve, reject) => {
    log("🚀 Starting Ule Msee backend server...", "magenta")
    log(`📍 Backend directory: ${BACKEND_DIR}`, "blue")

    const backendProcess = spawn(
      pythonCmd,
      ["-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
      {
        cwd: BACKEND_DIR,
        stdio: "inherit",
        shell: true,
      },
    )

    // Give the server a moment to start
    setTimeout(() => {
      log("🌟 Ule Msee backend should be running on http://localhost:8000", "green")
      log("📚 API docs available at http://localhost:8000/docs", "cyan")
      log("🔍 Health check at http://localhost:8000/health", "cyan")
      resolve(backendProcess)
    }, 3000)

    backendProcess.on("error", (error) => {
      log(`❌ Backend startup error: ${error.message}`, "red")
      reject(error)
    })

    // Handle process termination
    process.on("SIGINT", () => {
      log("\n🛑 Shutting down Ule Msee backend...", "yellow")
      backendProcess.kill("SIGINT")
      process.exit(0)
    })

    process.on("SIGTERM", () => {
      backendProcess.kill("SIGTERM")
      process.exit(0)
    })
  })
}

async function main() {
  try {
    log("🧠 Starting Ule Msee AI Assistant Backend...", "bright")

    // Check if backend is set up
    if (!checkBackendSetup()) {
      process.exit(1)
    }

    // Check Python installation
    const pythonCmd = await checkPythonInstallation()
    if (!pythonCmd) {
      log("❌ Python not found! Please install Python 3.8+ from https://python.org", "red")
      log("💡 Make sure to check 'Add Python to PATH' during installation", "yellow")
      process.exit(1)
    }

    // Check environment configuration
    if (!checkEnvConfiguration()) {
      log("⏸️  Please configure your backend/.env file and try again", "yellow")
      process.exit(1)
    }

    // Check port availability
    await checkPort8000()

    // Start backend server
    await startBackend(pythonCmd)
  } catch (error) {
    log(`❌ Error: ${error.message}`, "red")
    log("", "reset")
    log("💡 Troubleshooting tips:", "yellow")
    log("- Make sure the backend directory exists", "yellow")
    log("- Run 'pnpm run backend:install' to set up the backend", "yellow")
    log("- Check that your GROQ_API_KEY is configured in backend/.env", "yellow")
    log("- Ensure no other service is using port 8000", "yellow")
    process.exit(1)
  }
}

main()
