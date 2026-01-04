'use client'

import { useChat } from 'ai/react'
import { ChatLine } from './ChatLine'
import { Message, MessageContent } from '@/components/ai-elements/message'
import { PromptInput } from '@/components/ai-elements/prompt-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEffect, useRef } from 'react'
import { Streamdown } from 'streamdown'

interface MainChatProps {
    clubId: string
    onBackToConfig: () => void
}

export function MainChat({ clubId, onBackToConfig }: MainChatProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/agent/chat',
        body: {
            clubId,
        },
    })

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="flex flex-col h-[calc(100vh-200px)]">
            <ChatLine onBackToConfig={onBackToConfig} />

            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-center">
                            <div>
                                <p className="text-muted-foreground mb-2">
                                    Empieza una conversación con tu agente
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Haz una pregunta o pide ayuda sobre cualquier tema configurado
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <Message key={message.id} from={message.role}>
                                <MessageContent>
                                    <Streamdown text={message.content} />
                                </MessageContent>
                            </Message>
                        ))
                    )}
                </div>
            </ScrollArea>

            <div className="pt-4 border-t border-border">
                <form onSubmit={handleSubmit}>
                    <PromptInput
                        value={input}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        placeholder="Escribe tu mensaje..."
                    />
                </form>
            </div>
        </div>
    )
}
