const { spawn, exec } = require("child_process")
const fs = require("fs")
const path = require("path")

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

function checkPython() {
  return new Promise((resolve) => {
    const pythonCommands = ["python3", "python", "py"]

    const checkNext = (index) => {
      if (index >= pythonCommands.length) {
        resolve(null)
        return
      }

      const cmd = pythonCommands[index]
      exec(`${cmd} --version`, (error, stdout) => {
        if (!error && stdout.includes("Python")) {
          log(`✅ Found Python: ${stdout.trim()}`, "green")
          resolve(cmd)
        } else {
          checkNext(index + 1)
        }
      })
    }

    checkNext(0)
  })
}

async function startBackend() {
  log("🧠 Starting Ule Msee AI Assistant Backend...", "bright")

  // Check Python
  const pythonCmd = await checkPython()
  if (!pythonCmd) {
    log("❌ Python not found! Please install Python 3.8+", "red")
    return false
  }

  // Start the backend script
  log("🚀 Launching backend server...", "blue")

  const backendProcess = spawn(pythonCmd, ["scripts/run-ule-msee-backend.py"], {
    stdio: "inherit",
    shell: true,
  })

  // Handle process events
  backendProcess.on("error", (error) => {
    log(`❌ Backend error: ${error.message}`, "red")
  })

  // Handle termination
  process.on("SIGINT", () => {
    log("\n🛑 Shutting down backend...", "yellow")
    backendProcess.kill("SIGINT")
    process.exit(0)
  })

  return true
}

async function main() {
  try {
    await startBackend()
  } catch (error) {
    log(`❌ Error: ${error.message}`, "red")
    process.exit(1)
  }
}

main()
