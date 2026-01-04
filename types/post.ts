/**
 * Post types based on database.sql schema
 */

export interface Post {
    id: string
    club_id: string | null
    content: Record<string, any> | null
    type: string | null
    created_at: string
}

// Enriched Post type with computed properties for UI components
export interface EnrichedPost extends Post {
    user: {
        name: string
        username: string
        avatar: string
    }
    createdAt: string // Formatted date string
    imageUrl?: string
    videoUrl?: string
    audioUrl?: string
    audioName?: string
    likesCount: number
    commentsCount: number
    viewsCount: number
    superlikesCount: number
    isLiked: boolean
    isSuperliked: boolean
}

export interface PostStats {
    id: number
    post_id: string
    likes: number | null
    superlikes: number | null
    comments: number | null
    user_views: number | null
}

export interface PostInteraction {
    id: string
    post_id: string
    user_id: string
    interaction_type: 'like' | 'superlike'
    created_at: string
}

export interface PostComment {
    id: string
    post_id: string
    user_id: string
    content: string
    parent_comment_id: string | null
    created_at: string
}

export interface Poll {
    id: string
    post_id: string
    question: string
    options: any[] // Array of options from jsonb
    is_anonymous: boolean
    is_multiple_choice: boolean
    allows_add_options: boolean
    closes_at: string | null
    total_votes: number
    created_at: string
    updated_at: string
}

// Enums for type safety
export enum PostTypes {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    POLL = 'poll',
}

export enum InteractionType {
    LIKE = 'like',
    SUPERLIKE = 'superlike',
}
