"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Send, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import SetupGuide from "@/components/setup-guide"
import { askQuestion, checkBackendHealth } from "@/lib/api"
import ResponseDisplay from "@/components/response-display"

interface ConnectionState {
  isConnected: boolean
  isChecking: boolean
  lastChecked: Date | null
  error: string | null
}

interface ChatMessage {
  type: "user" | "ulemsee"
  content: string
}

export default function QAInterface() {
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [chatLog, setChatLog] = useState<ChatMessage[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isChecking: true,
    lastChecked: null,
    error: null,
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionState((prev) => ({ ...prev, isChecking: true, error: null }))
      try {
        const isHealthy = await checkBackendHealth()
        setConnectionState({
          isConnected: isHealthy,
          isChecking: false,
          lastChecked: new Date(),
          error: null,
        })
        if (!isHealthy) {
          setShowSetupGuide(true)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Connection failed"
        setConnectionState({
          isConnected: false,
          isChecking: false,
          lastChecked: new Date(),
          error: errorMessage,
        })
        setShowSetupGuide(true)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!question.trim()) {
      toast({
        title: "Empty question",
        description: "Please enter a question for Ule Msee to answer.",
        variant: "destructive",
      })
      return
    }

    if (question.trim().length > 2000) {
      toast({
        title: "Question too long",
        description: "Please keep your question under 2000 characters.",
        variant: "destructive",
      })
      return
    }

    if (!connectionState.isConnected) {
      toast({
        title: "Connection Error",
        description: "Ule Msee is not available. Please check the backend connection.",
        variant: "destructive",
      })
      setShowSetupGuide(true)
      return
    }

    const userQuestion = question.trim()
    setChatLog((prev) => [...prev, { type: "user", content: userQuestion }])
    setIsLoading(true)
    setShowSetupGuide(false)
    setQuestion("")

    try {
      const data = await askQuestion(userQuestion)
      setChatLog((prev) => [...prev, { type: "ulemsee", content: data.response }])
      router.refresh()

      toast({
        title: "Response received",
        description: "Ule Msee has provided an answer to your question.",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get a response from Ule Msee."

      if (errorMessage.includes("Unable to connect") || errorMessage.includes("fetch")) {
        setConnectionState((prev) => ({ ...prev, isConnected: false, error: errorMessage }))
        setShowSetupGuide(true)
        toast({
          title: "Connection Error",
          description: "Unable to reach Ule Msee. Please check if the backend is running.",
          variant: "destructive",
        })
      } else if (errorMessage.includes("timeout") || errorMessage.includes("504")) {
        toast({
          title: "Timeout Error",
          description: "Ule Msee is taking too long to respond. Please try again.",
          variant: "destructive",
        })
      } else if (errorMessage.includes("API key") || errorMessage.includes("401") || errorMessage.includes("403")) {
        toast({
          title: "Authentication Error",
          description: "There's an issue with the API configuration. Please check your Groq API key.",
          variant: "destructive",
        })
        setShowSetupGuide(true)
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many requests. Please wait a moment before trying again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const retryConnection = async () => {
    setConnectionState((prev) => ({ ...prev, isChecking: true, error: null }))
    try {
      const isHealthy = await checkBackendHealth()
      setConnectionState({
        isConnected: isHealthy,
        isChecking: false,
        lastChecked: new Date(),
        error: null,
      })
      if (isHealthy) {
        setShowSetupGuide(false)
        toast({
          title: "Connection Restored",
          description: "Ule Msee is now available and ready to answer your questions.",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Connection failed"
      setConnectionState({
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        error: errorMessage,
      })
    }
  }

  return (
    <div className="space-y-6">
      {!connectionState.isConnected && !connectionState.isChecking && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Ule Msee is currently unavailable. {connectionState.error && `Error: ${connectionState.error}`}</span>
            <Button variant="outline" size="sm" onClick={retryConnection} disabled={connectionState.isChecking}>
              {connectionState.isChecking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : "Retry"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {connectionState.isConnected && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Ule Msee is ready to answer your questions with AI-powered wisdom.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {chatLog.map((msg, idx) => (
          msg.type === "ulemsee" ? (
            <Card key={idx} className="p-4 bg-muted w-full">
              <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">Ule Msee</div>
              <ResponseDisplay content={msg.content} />
            </Card>
          ) : (
            <Card key={idx} className="p-4 bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%]">
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">You</div>
              <p className="text-base">{msg.content}</p>
            </Card>
          )
        ))}
        {isLoading && (
          <Card className="p-4 bg-muted w-full">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Ule Msee is thinking...</span>
            </div>
          </Card>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Ask Ule Msee a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[120px] resize-none pr-12 text-base"
            disabled={isLoading || !connectionState.isConnected}
            maxLength={2000}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">{question.length}/2000</span>
            <Button type="submit" size="icon" disabled={isLoading || !question.trim() || !connectionState.isConnected}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">{isLoading ? "Asking Ule Msee..." : "Ask Ule Msee"}</span>
            </Button>
          </div>
        </div>
        {question.trim() && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Press Enter or click Send to ask Ule Msee your question
          </p>
        )}
      </form>

      {showSetupGuide && <SetupGuide />}
    </div>
  )
}
