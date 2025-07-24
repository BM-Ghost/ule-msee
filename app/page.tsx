import { Suspense } from "react"
import QAInterface from "@/components/qa-interface"
import HistorySidebar from "@/components/history-sidebar"
import ConnectionStatus from "@/components/connection-status"
import { Toaster } from "@/components/ui/toaster"
import LoadingState from "@/components/loading-state"

export default function Home() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Connection status indicator */}
      <ConnectionStatus />

      {/* Sidebar for history */}
      <Suspense
        fallback={<div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700" />}
      >
        <HistorySidebar />
      </Suspense>

      {/* Main content area */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ule Msee AI Assistant
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                Your AI-powered companion for intelligent answers and insights
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                "Ule Msee" means wisdom in Swahili - ask any question and receive thoughtful, well-researched responses
              </p>
            </div>

            <Suspense fallback={<LoadingState />}>
              <QAInterface />
            </Suspense>
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  )
}
