'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Lock, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ChatMessageItem } from '@/components/chats/chat-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import {
    type ChatMessage,
    useRealtimeChat,
} from '@/hooks/use-realtime-chat'
import { cn } from '@/lib/utils'


interface RealtimeChatProps {
    roomName: string
    username: string
    onMessage?: (messages: ChatMessage[]) => void
    messages?: ChatMessage[]
}

export const RealtimeChat = ({
    roomName,
    username,
    onMessage,
    messages: initialMessages = [],
}: RealtimeChatProps) => {
    const { containerRef, scrollToBottom } = useChatScroll()

    const {
        messages: realtimeMessages,
        sendMessage,
        isConnected,
    } = useRealtimeChat({
        roomName,
        username,
    })
    const [newMessage, setNewMessage] = useState('')

    const allMessages = useMemo(() => {
        const mergedMessages = [...initialMessages, ...realtimeMessages]
        const uniqueMessages = mergedMessages.filter(
            (message, index, self) => index === self.findIndex((m) => m.id === message.id)
        )
        return uniqueMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }, [initialMessages, realtimeMessages])

    useEffect(() => {
        if (onMessage) onMessage(allMessages)
    }, [allMessages, onMessage])

    useEffect(() => {
        scrollToBottom()
    }, [allMessages, scrollToBottom])

    const handleSendMessage = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault()
            if (!newMessage.trim() || !isConnected) return
            sendMessage(newMessage)
            setNewMessage('')
        },
        [newMessage, isConnected, sendMessage]
    )

    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
            {/* Messages area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <AnimatePresence initial={false}>
                    {allMessages.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6"
                        >
                            {/* Glow ring */}
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150 animate-pulse" />
                                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 backdrop-blur-sm">
                                    <Lock className="w-10 h-10 text-primary/70" />
                                </div>
                            </div>

                            <div className="space-y-2 max-w-xs">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 justify-center">
                                    Chat privado del club
                                    <Sparkles className="w-4 h-4 text-primary" />
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Nadie ha escrito aún. Sé el primero en romper el hielo y comenzar la conversación.
                                </p>
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                            >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Comienza a chatear ↓
                            </motion.div>
                        </motion.div>
                    ) : (
                        allMessages.map((message, index) => {
                            const prevMessage = index > 0 ? allMessages[index - 1] : null
                            const showHeader = !prevMessage || prevMessage.user.name !== message.user.name
                            return (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                >
                                    <ChatMessageItem
                                        message={message}
                                        isOwnMessage={message.user.name === username}
                                        showHeader={showHeader}
                                    />
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Glass input bar */}
            <form
                onSubmit={handleSendMessage}
                className="flex w-full items-center gap-2 border-t border-border/50 p-3 bg-background/80 backdrop-blur-sm"
            >
                <Input
                    className={cn(
                        'rounded-full bg-muted/60 border-transparent focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/30 text-sm transition-all duration-300 placeholder:text-muted-foreground/50',
                        isConnected && newMessage.trim() ? 'w-[calc(100%-44px)]' : 'w-full'
                    )}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isConnected ? 'Escribe un mensaje...' : 'Conectando...'}
                    disabled={!isConnected}
                />
                <AnimatePresence>
                    {isConnected && newMessage.trim() && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.7, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.7, x: 10 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Button
                                type="submit"
                                size="icon"
                                className="rounded-full h-9 w-9 bg-primary hover:bg-primary/90 shadow-[0_0_12px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] transition-shadow"
                            >
                                <Send className="size-4" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </div>
    )
}
