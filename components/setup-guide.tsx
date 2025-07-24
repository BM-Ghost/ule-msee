"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Terminal, Server, Play, Key, ExternalLink, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SetupGuide() {
  return (
    <Card className="mt-8 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <Brain className="h-5 w-5" />
          Usijipee stress my guy!
        </CardTitle>
        <CardDescription>
          Unlock Ule Msee's AI-powered wisdom
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">🎉 Once Connected</h4>
          <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
            <p>• You can start asking questions</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
