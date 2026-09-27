'use client'

import { Bot, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ChatLineProps {
    onBackToConfig: () => void
}

export function ChatLine({ onBackToConfig }: ChatLineProps) {
    return (
        <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Chat con el Agente</h2>
                    <p className="text-sm text-muted-foreground">Prueba las capacidades de tu agente</p>
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onBackToConfig}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Configuración
            </Button>
        </div>
    )
}
