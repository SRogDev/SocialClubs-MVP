'use client'

import { MessageSquare } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'


interface AppealButtonProps {
    clubId: string
    clubName: string
}

/**
 * Botón para iniciar proceso de apelación
 * Client Component para interactividad
 */
export function AppealButton({ clubId, clubName }: AppealButtonProps) {
    const { toast } = useToast()
    const [isAppealing, setIsAppealing] = useState(false)

    const handleAppeal = async () => {
        setIsAppealing(true)
        try {
            // TODO: Implementar startAppealProcess(clubId)
            // Por ahora solo muestra un toast
            await new Promise(resolve => setTimeout(resolve, 1000))

            toast({
                title: 'Apelación enviada',
                description: `Tu apelación para "${clubName}" ha sido enviada. Te contactaremos pronto.`,
            })
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo enviar la apelación. Intenta nuevamente.',
            })
        } finally {
            setIsAppealing(false)
        }
    }

    return (
        <Button
            onClick={handleAppeal}
            disabled={isAppealing}
            size="lg"
            className="w-full sm:w-auto"
        >
            <MessageSquare className="mr-2 h-4 w-4" />
            {isAppealing ? 'Enviando...' : 'Apelar Baneo'}
        </Button>
    )
}
