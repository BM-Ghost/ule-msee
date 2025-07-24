"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Clock, Menu, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { fetchHistory, deleteHistoryItem, clearHistory } from "@/lib/api"
import type { HistoryItem } from "@/lib/types"

export default function HistorySidebar() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await fetchHistory()
        setHistory(data)
      } catch (error) {
        console.error("Error loading history:", error)
        // Set empty history instead of showing error toast on initial load
        setHistory([])
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [toast])

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteHistoryItem(id)
      setHistory(history.filter((item) => item.id !== id))
      toast({
        title: "Deleted",
        description: "History item removed successfully.",
      })
    } catch (error) {
      console.error("Error deleting history item:", error)
      toast({
        title: "Error",
        description: "Failed to delete history item.",
        variant: "destructive",
      })
    }
  }

  const handleClearHistory = async () => {
    try {
      await clearHistory()
      setHistory([])
      toast({
        title: "Cleared",
        description: "History cleared successfully.",
      })
    } catch (error) {
      console.error("Error clearing history:", error)
      toast({
        title: "Error",
        description: "Failed to clear history.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Clock className="h-5 w-5" /> History
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            disabled={history.length === 0}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Clear All</span>
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-65px)]">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse flex space-x-2">
                <div className="h-2 w-2 bg-gray-500 dark:bg-gray-300 rounded-full"></div>
                <div className="h-2 w-2 bg-gray-500 dark:bg-gray-300 rounded-full"></div>
                <div className="h-2 w-2 bg-gray-500 dark:bg-gray-300 rounded-full"></div>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400">
              <p>No history yet</p>
              <p className="text-xs mt-1">Questions will appear here after you ask them</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="truncate flex-1 text-sm">{item.question}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  )
}
