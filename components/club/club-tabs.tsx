"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Channel } from "@/types/club"

interface ClubTabsProps {
  channels: Channel[]
  activeTab: string
  onTabChange: (value: string) => void
}

export default function ClubTabs({ channels, activeTab, onTabChange }: ClubTabsProps) {
  return (
    <div className="sticky top-[73px] z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-2">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="grid w-full grid-cols-5 h-9">
            {channels.map((channel) => (
              <TabsTrigger key={channel.id} value={channel.id} className="text-xs px-2">
                {channel.name}
                {channel.price > 0 && <span className="ml-1 text-xs opacity-60">${channel.price}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
