import type { ChatMessage } from '@/hooks/use-realtime-chat'
import { cn } from '@/lib/utils'

interface ChatMessageItemProps {
    message: ChatMessage
    isOwnMessage: boolean
    showHeader: boolean
}

export const ChatMessageItem = ({ message, isOwnMessage, showHeader }: ChatMessageItemProps) => {
    return (
        <div className={`flex mt-1.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div
                className={cn('max-w-[75%] w-fit flex flex-col gap-0.5', {
                    'items-end': isOwnMessage,
                })}
            >
                {showHeader && (
                    <div
                        className={cn('flex items-center gap-2 text-xs px-2 mb-0.5', {
                            'justify-end flex-row-reverse': isOwnMessage,
                        })}
                    >
                        <span className="font-medium text-foreground/70">{message.user.name}</span>
                        <span className="text-foreground/35 text-[11px]">
                            {new Date(message.createdAt).toLocaleTimeString('es', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            })}
                        </span>
                    </div>
                )}
                <div
                    className={cn(
                        'py-2 px-3.5 rounded-2xl text-sm w-fit leading-relaxed shadow-sm',
                        isOwnMessage
                            ? [
                                'bg-gradient-to-br from-primary to-[hsl(var(--electric-orange-deep))]',
                                'text-white rounded-br-sm',
                                'shadow-[0_2px_12px_hsl(var(--primary)/0.35)]',
                            ]
                            : 'bg-muted/80 text-foreground rounded-bl-sm border border-border/40'
                    )}
                >
                    {message.content}
                </div>
            </div>
        </div>
    )
}
