import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart2, Hash, Users, Clock } from "lucide-react"

interface TrendCardProps {
  title: string
  value: string
  description?: string
  type: "stat" | "topic" | "search"
  icon?: "trending" | "chart" | "hashtag" | "users" | "clock"
  change?: string
}

export default function TrendCard({ title, value, description, type, icon = "trending", change }: TrendCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "trending":
        return <TrendingUp size={18} className="text-primary transition-transform group-hover:scale-110" />
      case "chart":
        return <BarChart2 size={18} className="text-primary transition-transform group-hover:scale-110" />
      case "hashtag":
        return <Hash size={18} className="text-primary transition-transform group-hover:scale-110" />
      case "users":
        return <Users size={18} className="text-primary transition-transform group-hover:scale-110" />
      case "clock":
        return <Clock size={18} className="text-primary transition-transform group-hover:scale-110" />
      default:
        return <TrendingUp size={18} className="text-primary transition-transform group-hover:scale-110" />
    }
  }

  return (
    <Card className="min-w-[240px] w-60 flex-shrink-0 hover:bg-accent/50 transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] group border-amber-100/50 dark:border-amber-900/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          {getIcon()}
        </div>

        {type === "stat" ? (
          <div className="flex items-end justify-between">
            <span className="text-2xl font-serif font-bold">{value}</span>
            {change && (
              <Badge variant="success" className="transition-all group-hover:scale-105">
                {change}
              </Badge>
            )}
          </div>
        ) : (
          <div>
            <div className="text-lg font-serif font-bold mb-1">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
