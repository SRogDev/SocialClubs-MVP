/**
 * Membership and subscription types based on database.sql schema
 */

export interface Membership {
    id: string
    club_id: string | null
    price: number | null
    content: Record<string, any> | null
}

export interface UserMembership {
    id: string
    user: string
    membership: string
    status: string
    expire_date: string | null
    created_at: string
}

export enum MembershipStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}
