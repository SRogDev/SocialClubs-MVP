/**
 * Channel and messaging types based on database.sql schema
 */

export interface Channel {
    id: number
    club_id: string | null
    name: string | null
    membership: string | null
    type: string | null // 'escalonado' or 'extra'
}

export interface ChatMessage {
    id: number
    channel_id: number | null
    user_id: string | null
    content: Record<string, any> | null
    type_message: string | null
    created_at: string
}

export enum ChannelType {
    ESCALONADO = 'escalonado',
    EXTRA = 'extra',
}
