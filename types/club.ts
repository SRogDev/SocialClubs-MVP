/**
 * Club types based on database.sql schema
 */

export interface Club {
    id: string
    name: string | null
    logo: Record<string, any> | null
    bio: string | null
    color: string | null
    level: number | null
    privacity: string | null
    creator: string | null
    tags: any | null
    total_members: number | null
    created_at: string
}

export interface Channel {
    id: number
    club_id: string | null
    name: string | null
    membership: string | null
    type: string | null // 'escalonado' or 'extra'
}

export interface ClubStats {
    id: number
    club: string | null
    engagement: number | null
    revenue: number | null
    superlikes: number | null
    e: number | null
    s: number | null
    sd: number | null
    gg: number | null
    vvv: number | null
    created_at: string
}

export interface ClubBadge {
    id: number
    club: string | null
    founder: boolean | null
    title: string | null
    verification: string | null
}

export interface ClubAgent {
    id: string
    club_id: string
    system_prompt: string | null
    base_context: string | null
    temperature: number | null
    created_at: string
    updated_at: string
}
