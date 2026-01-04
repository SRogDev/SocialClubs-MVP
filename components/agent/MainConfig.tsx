'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { agentConfigSchema, type AgentConfig } from '@/schemas/agentSchema'
import { ConfigOptions } from './ConfigOptions'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { saveAgentConfigAction } from '@/app/actions/agentActions'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { vibrate } from '@/utils/pwa'

interface MainConfigProps {
    clubId: string
    initialConfig?: AgentConfig
}

export function MainConfig({ clubId, initialConfig }: MainConfigProps) {
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<AgentConfig>({
        resolver: zodResolver(agentConfigSchema),
        defaultValues: initialConfig || {
            personality: {
                role: '',
                tone: 'didactico',
                temperature: 0.7,
            },
            context: {
                baseKnowledge: '',
                boundaryRules: [],
            },
            skills: [],
        },
    })

    const onSubmit = async (data: AgentConfig) => {
        setIsSubmitting(true)
        vibrate([50])

        try {
            const result = await saveAgentConfigAction(clubId, data)

            if (result.success) {
                toast({
                    title: 'Configuración guardada',
                    description: 'La configuración del agente se ha guardado correctamente',
                })
                vibrate([50, 100, 50])
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'No se pudo guardar la configuración',
                    variant: 'destructive',
                })
                vibrate([100])
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Ocurrió un error al guardar la configuración',
                variant: 'destructive',
            })
            vibrate([100])
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ConfigOptions form={form} />

            <div className="flex justify-end pt-6 border-t border-border">
                <Button type="submit" disabled={isSubmitting} size="lg">
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Aplicar Cambios
                </Button>
            </div>
        </form>
    )
}
