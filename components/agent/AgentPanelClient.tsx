'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainConfig } from '@/components/agent/MainConfig'
import { MainChat } from '@/components/agent/MainChat'
import { AgentTabsTransition } from '@/components/agent/AgentTabsTransition'
import { Bot, Settings } from 'lucide-react'

interface AgentPanelClientProps {
    clubId: string
    agentName: string
    agentSkills: { name: string; action: string }[]
}

export function AgentPanelClient({ clubId, agentName, agentSkills }: AgentPanelClientProps) {
    const [activeTab, setActiveTab] = useState<'config' | 'chat'>('config')

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'config' | 'chat')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="config" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configuración
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Chat
                </TabsTrigger>
            </TabsList>

            <AgentTabsTransition activeTab={activeTab}>
                {activeTab === 'config' ? (
                    <MainConfig clubId={clubId} />
                ) : (
                    <MainChat
                        clubId={clubId}
                        agentName={agentName}
                        agentSkills={agentSkills}
                        onBackToConfig={() => setActiveTab('config')}
                    />
                )}
            </AgentTabsTransition>
        </Tabs>
    )
}
