'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Streamdown } from 'streamdown'

import { Message, MessageContent } from '@/components/ai-elements/message'
import { PromptInput } from '@/components/ai-elements/prompt-input'
import { ScrollArea } from '@/components/ui/scroll-area'

import { ChatLine } from './ChatLine'

/* ─── Thinking Dots ──────────────────────────────────────────── */
function ThinkingDots() {
    return (
        <div className="flex items-center gap-1 px-1 py-2">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary/60"
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    )
}

interface MainChatProps {
    clubId: string
    agentName?: string
    agentSkills?: { name: string; action: string }[]
    onBackToConfig: () => void
}

export function MainChat({ clubId, agentName, agentSkills = [], onBackToConfig }: MainChatProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [input, setInput] = useState('')

    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/agent/chat',
            body: { clubId },
        }),
    })

    const isLoading = status === 'submitted' || status === 'streaming'

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return
        sendMessage({ text: input })
        setInput('')
    }

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    const handleStarterPrompt = (prompt: string) => {
        if (isLoading) return
        sendMessage({ text: prompt })
    }

    // Derive starter prompts from skills, fallback to generic ones
    const starterPrompts = agentSkills.length > 0
        ? agentSkills.slice(0, 3).map((s) => s.name)
        : ['¿Qué puedes hacer?', '¿De qué trata este club?', 'Recomiéndame algo']

    return (
        <div className="flex flex-col h-[calc(100vh-200px)]">
            <ChatLine onBackToConfig={onBackToConfig} />

            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                    {messages.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col items-center justify-center h-64 text-center gap-4"
                        >
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                                <Sparkles className="w-8 h-8 text-primary/60" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">
                                    {agentName || 'Agente del club'}
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Pregúntame lo que quieras sobre el club
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                {starterPrompts.map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => handleStarterPrompt(prompt)}
                                        className="px-3 py-1.5 text-sm rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        messages.map((message: UIMessage) => (
                            <Message key={message.id} from={message.role}>
                                <MessageContent>
                                    {message.parts.map((part, i) =>
                                        part.type === 'text' ? (
                                            <Streamdown key={`${message.id}-${i}`} text={part.text} />
                                        ) : null,
                                    )}
                                </MessageContent>
                            </Message>
                        ))
                    )}

                    {/* Thinking indicator */}
                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                        <Message from="assistant">
                            <MessageContent>
                                <ThinkingDots />
                            </MessageContent>
                        </Message>
                    )}
                </div>
            </ScrollArea>

            <div className="pt-4 border-t border-border">
                <form onSubmit={handleSubmit}>
                    <PromptInput
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        placeholder="Escribe tu mensaje..."
                    />
                </form>
            </div>
        </div>
    )
}
