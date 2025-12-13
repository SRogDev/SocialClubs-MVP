import { Link2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { WidgetData } from "@/types/widget"

interface WidgetMagicLinkProps {
  data: WidgetData
  preview?: boolean
}

export default function WidgetMagicLink({ data, preview = false }: WidgetMagicLinkProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <Link2 size={18} className="mr-2 text-primary" />
          <h3 className="font-medium">{data.title}</h3>
        </div>
        {!preview ? (
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="block w-full">
            <Button className="w-full group">
              <span className="mr-2">Visitar enlace</span>
              <ExternalLink
                size={16}
                className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
              />
            </Button>
          </a>
        ) : (
          <div className="p-3 bg-muted/30 rounded-md text-sm">{data.url}</div>
        )}
      </CardContent>
    </Card>
  )
}
