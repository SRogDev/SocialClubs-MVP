/**
 * Gamification Type Definitions
 * Based on Supabase schema for club gamification system
 */

// ==========================================
// DATABASE TYPES (matching Supabase schema)
// ==========================================

/**
 * Club Gamification Actions - Defines point rules per action type
 */
export interface ClubGamificationAction {
    id: string; // uuid
    club_id: string | null; // uuid, nullable
    type: string; // action type (e.g., 'post_created', 'comment_added', 'like_given')
    value: number; // points awarded for this action (default 0)
    created_at: string; // timestamptz
}

/**
 * Club Gamification Rewards - Defines rewards users can claim with points
 */
export interface ClubGamificationReward {
    id: string; // uuid
    club_id: string | null; // uuid, nullable
    responsibility: 'promise' | 'virtual'; // CHECK constraint
    bounty: Record<string, unknown>; // jsonb, default {}
    points_required: number; // integer, CHECK >= 0
    status: 'active' | 'inactive' | 'paused'; // CHECK constraint, default 'active'
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

/**
 * User Club Points - Tracks points per user per club
 */
export interface UserClubPoints {
    id: number; // bigint
    user_id: string | null; // uuid
    club_id: string | null; // uuid
    role: string | null;
    points: number | null; // smallint
    created_at: string; // timestamptz
    invite_code: string | null;
}

/**
 * User Global Points - Tracks special interaction points (superlikes)
 */
export interface UserPoints {
    id: number; // bigint
    user: string | null; // uuid
    superlikes: number; // smallint, default 10
}

// ==========================================
// APPLICATION TYPES
// ==========================================

/**
 * Action types that trigger gamification events
 */
export type GamificationActionType =
    | 'post_created'
    | 'post_deleted'
    | 'comment_added'
    | 'like_given'
    | 'superlike_given'
    | 'club_created'
    | 'club_joined'
    | 'club_left'
    | 'member_invited'
    | 'daily_login'
    | 'weekly_active';

/**
 * Event data structure for gamification events
 */
export interface GamificationEvent {
    type: GamificationActionType;
    userId: string;
    clubId: string;
    metadata?: Record<string, unknown>; // Additional context (e.g., postId, commentId)
    timestamp: number;
}

/**
 * User gamification summary
 */
export interface UserGamification {
    userId: string;
    clubId: string;
    totalPoints: number;
    rank: number | null; // Position in club leaderboard
    achievements: Achievement[];
    rewardsEarned: ClaimedReward[];
    availableRewards: ClubGamificationReward[];
}

/**
 * Achievement tracking
 */
export interface Achievement {
    id: string;
    clubId: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: string | null;
    progress: number; // 0-100
    total: number; // Total required to unlock
}

/**
 * Claimed reward tracking
 */
export interface ClaimedReward {
    id: string;
    userId: string;
    rewardId: string;
    reward: ClubGamificationReward;
    claimedAt: string;
    fulfilledAt: string | null;
    status: 'claimed' | 'fulfilled' | 'expired';
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
    userId: string;
    username: string;
    avatarUrl: string | null;
    points: number;
    rank: number;
}

/**
 * Points transaction history
 */
export interface PointsTransaction {
    id: string;
    userId: string;
    clubId: string;
    actionType: GamificationActionType;
    pointsAwarded: number;
    description: string;
    createdAt: string;
}

// ==========================================
// INPUT TYPES (for API/Service functions)
// ==========================================

/**
 * Input for creating a gamification action rule
 */
export interface CreateGamificationActionInput {
    club_id: string;
    type: GamificationActionType;
    value: number;
}

/**
 * Input for creating a reward
 */
export interface CreateGamificationRewardInput {
    club_id: string;
    responsibility: 'promise' | 'virtual';
    bounty: Record<string, unknown>;
    points_required: number;
    status?: 'active' | 'inactive' | 'paused';
}

/**
 * Input for awarding points
 */
export interface AwardPointsInput {
    userId: string;
    clubId: string;
    actionType: GamificationActionType;
    metadata?: Record<string, unknown>;
}

/**
 * Input for claiming a reward
 */
export interface ClaimRewardInput {
    userId: string;
    rewardId: string;
}
