"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Loader2 } from "lucide-react"
import { checkBackendHealth } from "@/lib/api"

interface ConnectionState {
  status: "connected" | "disconnected" | "checking"
  lastChecked: Date | null
}

export default function ConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "checking",
    lastChecked: null,
  })

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionState((prev) => ({ ...prev, status: "checking" }))

      try {
        const isHealthy = await checkBackendHealth()
        setConnectionState({
          status: isHealthy ? "connected" : "disconnected",
          lastChecked: new Date(),
        })
      } catch (error) {
        setConnectionState({
          status: "disconnected",
          lastChecked: new Date(),
        })
      }
    }

    // Initial check
    checkConnection()

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusConfig = () => {
    switch (connectionState.status) {
      case "connected":
        return {
          variant: "default" as const,
          icon: <Wifi className="h-3 w-3 mr-1" />,
          text: "Ule Msee Online",
          className: "bg-green-500 hover:bg-green-600",
        }
      case "disconnected":
        return {
          variant: "destructive" as const,
          icon: <WifiOff className="h-3 w-3 mr-1" />,
          text: "Ule Msee Offline",
          className: "",
        }
      case "checking":
        return {
          variant: "secondary" as const,
          icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
          text: "Checking...",
          className: "",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge
      variant={config.variant}
      className={`fixed top-4 right-4 z-50 ${config.className}`}
      title={connectionState.lastChecked ? `Last checked: ${connectionState.lastChecked.toLocaleTimeString()}` : ""}
    >
      {config.icon}
      {config.text}
    </Badge>
  )
}
