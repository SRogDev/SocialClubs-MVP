'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainConfig } from '@/components/agent/MainConfig'
import { MainChat } from '@/components/agent/MainChat'
import { AgentTabsTransition } from '@/components/agent/AgentTabsTransition'
import { Card } from '@/components/ui/card'
import { Bot, Settings } from 'lucide-react'
import { getAgentMetaAction } from '@/app/actions/agentActions'

export default function AgentPage() {
    const searchParams = useSearchParams()
    const clubId = searchParams.get('clubId') || ''
    const [activeTab, setActiveTab] = useState<'config' | 'chat'>('config')
    const [agentName, setAgentName] = useState<string>('Agente del club')
    const [agentSkills, setAgentSkills] = useState<{ name: string; action: string }[]>([])

    useEffect(() => {
        if (!clubId) return
        getAgentMetaAction(clubId).then((meta) => {
            if (!meta) return
            setAgentName(meta.agentName)
            setAgentSkills(meta.skills)
        })
    }, [clubId])

    if (!clubId) {
        return (
            <div className="container mx-auto py-8">
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                        Por favor selecciona un club para configurar su agente
                    </p>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Agente del Club</h1>
                    <p className="text-muted-foreground">
                        Configura y chatea con el agente inteligente de tu club
                    </p>
                </div>

                <Card className="p-6">
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
                </Card>
            </div>
        </div>
    )
}
