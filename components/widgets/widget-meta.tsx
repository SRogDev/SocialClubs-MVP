import { Brain } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { WidgetData } from "@/types/widget"

interface WidgetMetaProps {
  data: WidgetData
  preview?: boolean
}

export default function WidgetMeta({ data, preview = false }: WidgetMetaProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <Brain size={18} className="mr-2 text-primary" />
          <h3 className="font-medium">{data.title}</h3>
        </div>
        <div className="p-3 bg-muted/30 rounded-md text-sm">{data.content}</div>
      </CardContent>
    </Card>
  )
}
