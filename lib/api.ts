import type { HistoryItem } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Enhanced error handling with retry logic
class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message)
    this.name = "APIError"
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
}

// Exponential backoff retry function
async function withRetry<T>(operation: () => Promise<T>, retries = RETRY_CONFIG.maxRetries): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, RETRY_CONFIG.maxRetries - retries),
        RETRY_CONFIG.maxDelay,
      )

      console.log(`Retrying in ${delay}ms... (${retries} retries left)`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return withRetry(operation, retries - 1)
    }
    throw error
  }
}

function shouldRetry(error: any): boolean {
  // Retry on network errors, timeouts, and 5xx server errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true
  }
  if (error instanceof APIError) {
    return error.status ? error.status >= 500 : false
  }
  return false
}

// Enhanced fetch wrapper with better error handling
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      const errorCode = response.status.toString()

      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
      } catch {
        // If we can't parse the error response, use the default message
      }

      // Map common HTTP status codes to user-friendly messages
      switch (response.status) {
        case 401:
          errorMessage = "Authentication failed. Please check your API key configuration."
          break
        case 403:
          errorMessage = "Access denied. Please verify your API key permissions."
          break
        case 404:
          errorMessage = "Service endpoint not found. Please check if the backend is running correctly."
          break
        case 429:
          errorMessage = "Rate limit exceeded. Please wait before making another request."
          break
        case 500:
          errorMessage = "Internal server error. Please try again later."
          break
        case 502:
        case 503:
          errorMessage = "Service temporarily unavailable. Please try again later."
          break
        case 504:
          errorMessage = "Request timeout. The AI service is taking too long to respond."
          break
      }

      throw new APIError(errorMessage, response.status, errorCode)
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === "AbortError") {
      throw new APIError("Request timeout. Please try again.", 504, "TIMEOUT")
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new APIError(
        "Unable to connect to Ule Msee's backend service. Please ensure the backend is running on the correct port.",
        0,
        "CONNECTION_ERROR",
      )
    }

    if (error instanceof APIError) {
      throw error
    }

    throw new APIError(
      `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      0,
      "UNKNOWN_ERROR",
    )
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await apiRequest<{ status: string }>("/health")
    return response.status === "healthy"
  } catch (error) {
    console.error("Backend health check failed:", error)
    return false
  }
}

export async function askQuestion(question: string): Promise<{ response: string }> {
  if (!question.trim()) {
    throw new APIError("Question cannot be empty", 400, "INVALID_INPUT")
  }

  if (question.length > 2000) {
    throw new APIError("Question is too long (max 2000 characters)", 400, "INVALID_INPUT")
  }

  return withRetry(() =>
    apiRequest<{ response: string }>("/api/question", {
      method: "POST",
      body: JSON.stringify({ question: question.trim() }),
    }),
  )
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  try {
    return await apiRequest<HistoryItem[]>("/api/history")
  } catch (error) {
    console.error("Failed to fetch history:", error)
    // Return empty array if backend is not available
    if (error instanceof APIError && error.status === 0) {
      return []
    }
    throw error
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  if (!id) {
    throw new APIError("History item ID is required", 400, "INVALID_INPUT")
  }

  await apiRequest<void>(`/api/history/${id}`, {
    method: "DELETE",
  })
}

export async function clearHistory(): Promise<void> {
  await apiRequest<void>("/api/history", {
    method: "DELETE",
  })
}
