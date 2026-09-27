import { redirect } from 'next/navigation'

import { AgentPanelClient } from '@/components/agent/AgentPanelClient'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { getAgentByClubId, getAgentSkills } from '@/services/agentService'

export default async function AgentPage({ params }: { params: { id: string } }) {
    const clubId = params.id
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()

    if (error || !data?.claims) {
        redirect('/auth/login')
    }

    const [{ data: club }, agent] = await Promise.all([
        supabase.from('clubs').select('name').eq('id', clubId).single(),
        getAgentByClubId(clubId),
    ])

    const skills = agent ? await getAgentSkills(agent.id) : []
    const agentName = club?.name ?? 'Agente del club'
    const agentSkills = skills.map((skill) => ({ name: skill.name, action: skill.action }))

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
                    <AgentPanelClient
                        clubId={clubId}
                        agentName={agentName}
                        agentSkills={agentSkills}
                    />
                </Card>
            </div>
        </div>
    )
}
