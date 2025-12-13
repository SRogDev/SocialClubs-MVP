"use client"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import TrendCard from "@/components/trend-card"

export interface SearchTrend {
  id: string
  title: string
  value: string
  description: string
  icon: string
}

interface SearchTrendsListProps {
  trends: SearchTrend[]
  title: string
}

export default function SearchTrendsList({ trends, title }: SearchTrendsListProps) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {trends.map((trend) => (
            <TrendCard
              key={trend.id}
              title={trend.title}
              value={trend.value}
              description={trend.description}
              icon={trend.icon}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
