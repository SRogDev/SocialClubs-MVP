/**
 * User types based on database.sql schema
 */

export interface User {
    id: string
    name: string
    username: string
    avatar_url: string | null
    bio: string | null
    is_member: boolean | null
    created_at: string
}

export interface UserProfile extends User {
    // Extended profile data
}

export interface UserPoints {
    id: number
    user: string
    superlikes: number
}

export interface UserClubMembership {
    id: number
    user_id: string
    club_id: string
    role: string | null
    points: number | null
    created_at: string
}
