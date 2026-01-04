/**
 * Gamification Zod Schemas
 * Validation schemas for gamification system
 */

import { z } from 'zod';

// ==========================================
// GAMIFICATION ACTION SCHEMAS
// ==========================================

/**
 * Valid action types
 */
export const gamificationActionTypeSchema = z.enum([
    'post_created',
    'post_deleted',
    'comment_added',
    'like_given',
    'superlike_given',
    'club_created',
    'club_joined',
    'club_left',
    'member_invited',
    'daily_login',
    'weekly_active',
]);

/**
 * Schema for creating a gamification action rule
 */
export const createGamificationActionSchema = z.object({
    club_id: z.string().uuid({ message: 'Invalid club ID format' }),
    type: gamificationActionTypeSchema,
    value: z
        .number()
        .int({ message: 'Points value must be an integer' })
        .min(0, { message: 'Points value cannot be negative' })
        .max(1000, { message: 'Points value cannot exceed 1000' }),
});

/**
 * Schema for updating a gamification action rule
 */
export const updateGamificationActionSchema = z.object({
    id: z.string().uuid({ message: 'Invalid action ID format' }),
    value: z
        .number()
        .int({ message: 'Points value must be an integer' })
        .min(0, { message: 'Points value cannot be negative' })
        .max(1000, { message: 'Points value cannot exceed 1000' }),
});

// ==========================================
// GAMIFICATION REWARD SCHEMAS
// ==========================================

/**
 * Responsibility types for rewards
 */
export const responsibilityTypeSchema = z.enum(['promise', 'virtual']);

/**
 * Reward status types
 */
export const rewardStatusSchema = z.enum(['active', 'inactive', 'paused']);

/**
 * Bounty schema (flexible JSONB)
 */
export const bountySchema = z.record(z.unknown()).refine(
    (data) => {
        // Must have at least a 'title' and 'description'
        return (
            typeof data.title === 'string' &&
            data.title.length > 0 &&
            typeof data.description === 'string' &&
            data.description.length > 0
        );
    },
    {
        message: 'Bounty must contain title and description',
    }
);

/**
 * Schema for creating a reward
 */
export const createGamificationRewardSchema = z.object({
    club_id: z.string().uuid({ message: 'Invalid club ID format' }),
    responsibility: responsibilityTypeSchema,
    bounty: bountySchema,
    points_required: z
        .number()
        .int({ message: 'Points required must be an integer' })
        .min(1, { message: 'Points required must be at least 1' })
        .max(100000, { message: 'Points required cannot exceed 100,000' }),
    status: rewardStatusSchema.optional().default('active'),
});

/**
 * Schema for updating a reward
 */
export const updateGamificationRewardSchema = z.object({
    id: z.string().uuid({ message: 'Invalid reward ID format' }),
    bounty: bountySchema.optional(),
    points_required: z
        .number()
        .int({ message: 'Points required must be an integer' })
        .min(1, { message: 'Points required must be at least 1' })
        .max(100000, { message: 'Points required cannot exceed 100,000' })
        .optional(),
    status: rewardStatusSchema.optional(),
});

// ==========================================
// POINTS OPERATIONS SCHEMAS
// ==========================================

/**
 * Schema for awarding points
 */
export const awardPointsSchema = z.object({
    userId: z.string().uuid({ message: 'Invalid user ID format' }),
    clubId: z.string().uuid({ message: 'Invalid club ID format' }),
    actionType: gamificationActionTypeSchema,
    metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for claiming a reward
 */
export const claimRewardSchema = z.object({
    userId: z.string().uuid({ message: 'Invalid user ID format' }),
    rewardId: z.string().uuid({ message: 'Invalid reward ID format' }),
});

/**
 * Schema for leaderboard query params
 */
export const leaderboardQuerySchema = z.object({
    clubId: z.string().uuid({ message: 'Invalid club ID format' }),
    limit: z
        .number()
        .int()
        .min(1, { message: 'Limit must be at least 1' })
        .max(100, { message: 'Limit cannot exceed 100' })
        .optional()
        .default(10),
    offset: z
        .number()
        .int()
        .min(0, { message: 'Offset cannot be negative' })
        .optional()
        .default(0),
});

/**
 * Schema for user gamification query params
 */
export const userGamificationQuerySchema = z.object({
    userId: z.string().uuid({ message: 'Invalid user ID format' }),
    clubId: z.string().uuid({ message: 'Invalid club ID format' }),
});

// ==========================================
// TYPE EXPORTS (inferred from schemas)
// ==========================================

export type GamificationActionType = z.infer<
    typeof gamificationActionTypeSchema
>;
export type CreateGamificationActionInput = z.infer<
    typeof createGamificationActionSchema
>;
export type UpdateGamificationActionInput = z.infer<
    typeof updateGamificationActionSchema
>;
export type CreateGamificationRewardInput = z.infer<
    typeof createGamificationRewardSchema
>;
export type UpdateGamificationRewardInput = z.infer<
    typeof updateGamificationRewardSchema
>;
export type AwardPointsInput = z.infer<typeof awardPointsSchema>;
export type ClaimRewardInput = z.infer<typeof claimRewardSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type UserGamificationQuery = z.infer<
    typeof userGamificationQuerySchema
>;
