'use client'

import { useEffect } from 'react'
import { Crisp } from 'crisp-sdk-web'

interface CrispChatProps {
    websiteId: string
}

/**
 * Componente de integración con Crisp Chat
 * Client Component que inicializa Crisp cuando se monta
 */
export function CrispChat({ websiteId }: CrispChatProps) {
    useEffect(() => {
        // Configurar Crisp solo en el cliente
        if (websiteId && websiteId !== 'YOUR_CRISP_ID') {
            Crisp.configure(websiteId)
        }

        // Cleanup cuando el componente se desmonte
        return () => {
            if (typeof Crisp !== 'undefined' && Crisp.chat) {
                Crisp.chat.hide()
            }
        }
    }, [websiteId])

    return null
}
