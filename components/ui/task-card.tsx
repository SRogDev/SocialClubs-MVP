"use client"

import { FileText, Link, MessageSquare, UserPlus, Zap, Copy, Check } from "lucide-react"
import type React from "react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"


export interface Task {
  id: string
  title: string
  type: "survey" | "link" | "text" | "invitation" | "action"
  status?: "pending" | "approved" | "rejected"
  data?: string
  userId?: string
  userName?: string
  createdAt?: string
  points?: number
  isInfinite?: boolean
  inviteLink?: string
}

interface TaskCardProps {
  task: Task
  onClick?: () => void
  variant?: "default" | "minigame"
}

export function TaskCard({ task, onClick, variant = "default" }: TaskCardProps) {
  const [copied, setCopied] = useState(false)

  const getTypeIcon = (type: Task["type"]) => {
    switch (type) {
      case "survey":
        return <MessageSquare className="h-4 w-4 md:h-6 md:w-6" />
      case "link":
        return <Link className="h-4 w-4 md:h-6 md:w-6" />
      case "text":
        return <FileText className="h-4 w-4 md:h-6 md:w-6" />
      case "invitation":
        return <UserPlus className="h-4 w-4 md:h-6 md:w-6" />
      case "action":
        return <Zap className="h-4 w-4 md:h-6 md:w-6" />
      default:
        return <FileText className="h-4 w-4 md:h-6 md:w-6" />
    }
  }

  const getTypeColor = (type: Task["type"]) => {
    switch (type) {
      case "survey":
        return "text-blue-500 bg-blue-100 dark:bg-blue-900/20"
      case "link":
        return "text-green-500 bg-green-100 dark:bg-green-900/20"
      case "text":
        return "text-purple-500 bg-purple-100 dark:bg-purple-900/20"
      case "invitation":
        return "text-orange-500 bg-orange-100 dark:bg-orange-900/20"
      case "action":
        return "text-red-500 bg-red-100 dark:bg-red-900/20"
      default:
        return "text-gray-500 bg-gray-100 dark:bg-gray-900/20"
    }
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.inviteLink) {
      try {
        await navigator.clipboard.writeText(task.inviteLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Failed to copy link:", err)
      }
    }
  }

  if (variant === "minigame") {
    return (
      <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={onClick}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
              <div className={`p-1.5 md:p-2 rounded-full ${getTypeColor(task.type)}`}>{getTypeIcon(task.type)}</div>
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate text-sm md:text-base block">{task.title}</span>
                {task.isInfinite && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Infinita
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {task.points && <Badge className="bg-primary text-primary-foreground text-xs">+{task.points} pts</Badge>}

              {task.type === "invitation" && task.inviteLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-7 w-7 p-0 md:h-8 md:w-8 bg-transparent"
                >
                  {copied ? <Check className="h-3 w-3 md:h-4 md:w-4" /> : <Copy className="h-3 w-3 md:h-4 md:w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Variant por defecto (admin)
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${onClick ? "hover:scale-105" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate text-sm md:text-base">{task.title}</h3>
          <div className={`p-1 rounded ${getTypeColor(task.type)}`}>{getTypeIcon(task.type)}</div>
        </div>

        {task.userName && <p className="text-xs md:text-sm text-muted-foreground">Por: {task.userName}</p>}

        <div className="flex items-center justify-between">
          {task.points && <Badge className="bg-primary text-primary-foreground text-xs">+{task.points} pts</Badge>}

          {task.status && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                task.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : task.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {task.status === "approved" ? "Aprobada" : task.status === "rejected" ? "Rechazada" : "Pendiente"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
