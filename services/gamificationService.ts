/**
 * Gamification Service - Repository Pattern
 * Handles all CRUD operations for the gamification system
 */

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type {
    ClubGamificationAction,
    ClubGamificationReward,
    UserGamification,
    LeaderboardEntry,
    PointsTransaction,
    CreateGamificationActionInput,
    CreateGamificationRewardInput,
    AwardPointsInput,
} from '@/types/gamification';

// ==========================================
// GAMIFICATION ACTIONS (RULES) - CRUD
// ==========================================

/**
 * Get all gamification actions for a club
 * @cached - React cache for server-side rendering
 */
export const getClubGamificationActions = cache(
    async (clubId: string): Promise<ClubGamificationAction[]> => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('club_gamification_actions')
            .select('*')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching club gamification actions:', error);
            throw new Error('Failed to fetch gamification actions');
        }

        return data as ClubGamificationAction[];
    }
);

/**
 * Get specific action rule for a club and action type
 */
export async function getClubActionRule(
    clubId: string,
    actionType: string
): Promise<ClubGamificationAction | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('club_gamification_actions')
        .select('*')
        .eq('club_id', clubId)
        .eq('type', actionType)
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        console.error('Error fetching action rule:', error);
        throw new Error('Failed to fetch action rule');
    }

    return data as ClubGamificationAction | null;
}

/**
 * Create a new gamification action rule
 */
export async function createGamificationAction(
    input: CreateGamificationActionInput
): Promise<ClubGamificationAction> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('club_gamification_actions')
        .insert({
            club_id: input.club_id,
            type: input.type,
            value: input.value,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating gamification action:', error);
        throw new Error('Failed to create gamification action');
    }

    return data as ClubGamificationAction;
}

/**
 * Update a gamification action rule
 */
export async function updateGamificationAction(
    actionId: string,
    value: number
): Promise<ClubGamificationAction> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('club_gamification_actions')
        .update({ value })
        .eq('id', actionId)
        .select()
        .single();

    if (error) {
        console.error('Error updating gamification action:', error);
        throw new Error('Failed to update gamification action');
    }

    return data as ClubGamificationAction;
}

/**
 * Delete a gamification action rule
 */
export async function deleteGamificationAction(
    actionId: string
): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('club_gamification_actions')
        .delete()
        .eq('id', actionId);

    if (error) {
        console.error('Error deleting gamification action:', error);
        throw new Error('Failed to delete gamification action');
    }
}

// ==========================================
// GAMIFICATION REWARDS - CRUD
// ==========================================

/**
 * Get all active rewards for a club
 * @cached - React cache for server-side rendering
 */
export const getClubRewards = cache(
    async (clubId: string): Promise<ClubGamificationReward[]> => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('club_gamification_rewards')
            .select('*')
            .eq('club_id', clubId)
            .eq('status', 'active')
            .order('points_required', { ascending: true });

        if (error) {
            console.error('Error fetching club rewards:', error);
            throw new Error('Failed to fetch club rewards');
        }

        return data as ClubGamificationReward[];
    }
);

/**
 * Get a single reward by ID
 */
export async function getRewardById(
    rewardId: string
): Promise<ClubGamificationReward | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('club_gamification_rewards')
        .select('*')
        .eq('id', rewardId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching reward:', error);
        throw new Error('Failed to fetch reward');
    }

    return data as ClubGamificationReward | null;
}

/**
 * Create a new reward
 */
export async function createGamificationReward(
    input: CreateGamificationRewardInput
): Promise<ClubGamificationReward> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('club_gamification_rewards')
        .insert({
            club_id: input.club_id,
            responsibility: input.responsibility,
            bounty: input.bounty,
            points_required: input.points_required,
            status: input.status || 'active',
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating reward:', error);
        throw new Error('Failed to create reward');
    }

    return data as ClubGamificationReward;
}

/**
 * Update a reward
 */
export async function updateGamificationReward(
    rewardId: string,
    updates: Partial<
        Pick<ClubGamificationReward, 'bounty' | 'points_required' | 'status'>
    >
): Promise<ClubGamificationReward> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('club_gamification_rewards')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', rewardId)
        .select()
        .single();

    if (error) {
        console.error('Error updating reward:', error);
        throw new Error('Failed to update reward');
    }

    return data as ClubGamificationReward;
}

/**
 * Delete a reward
 */
export async function deleteGamificationReward(rewardId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('club_gamification_rewards')
        .delete()
        .eq('id', rewardId);

    if (error) {
        console.error('Error deleting reward:', error);
        throw new Error('Failed to delete reward');
    }
}

// ==========================================
// POINTS OPERATIONS
// ==========================================

/**
 * Award points to a user in a club
 * This is the core function that will be called by event handlers
 */
export async function awardPoints(input: AwardPointsInput): Promise<void> {
    const supabase = await createClient();

    try {
        // 1. Get the action rule for this club and action type
        const actionRule = await getClubActionRule(input.clubId, input.actionType);

        if (!actionRule || actionRule.value === 0) {
            console.log(
                `No points configured for action ${input.actionType} in club ${input.clubId}`
            );
            return;
        }

        // 2. Update user's points in users_clubs table (atomic operation)
        const { error: updateError } = await supabase.rpc('increment_user_points', {
            p_user_id: input.userId,
            p_club_id: input.clubId,
            p_points: actionRule.value,
        });

        if (updateError) {
            // If RPC doesn't exist yet, fall back to manual update
            if (updateError.code === '42883') {
                // Function does not exist
                console.warn(
                    'increment_user_points RPC not found, using fallback UPDATE'
                );

                // Fallback: Manual UPDATE (not atomic, but works)
                const { error: fallbackError } = await supabase
                    .from('users_clubs')
                    .update({
                        points: supabase.raw(`COALESCE(points, 0) + ${actionRule.value}`),
                    })
                    .eq('user_id', input.userId)
                    .eq('club_id', input.clubId);

                if (fallbackError) {
                    throw fallbackError;
                }
            } else {
                throw updateError;
            }
        }

        console.log(
            `Awarded ${actionRule.value} points to user ${input.userId} for ${input.actionType}`
        );

        // 3. TODO: Log transaction in points_history table (to be created)
        // await logPointsTransaction({
        //   userId: input.userId,
        //   clubId: input.clubId,
        //   actionType: input.actionType,
        //   pointsAwarded: actionRule.value,
        //   metadata: input.metadata,
        // });

        // 4. TODO: Check for achievement unlocks
        // await checkAchievements(input.userId, input.clubId);
    } catch (error) {
        console.error('Error awarding points:', error);
        // Don't throw - we don't want to break the main flow if gamification fails
        // Just log the error and continue
    }
}

/**
 * Get user's total points in a club
 */
export async function getUserPoints(
    userId: string,
    clubId: string
): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('users_clubs')
        .select('points')
        .eq('user_id', userId)
        .eq('club_id', clubId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user points:', error);
        throw new Error('Failed to fetch user points');
    }

    return data?.points || 0;
}

/**
 * Get club leaderboard
 * @cached - React cache for server-side rendering
 */
export const getClubLeaderboard = cache(
    async (clubId: string, limit: number = 10): Promise<LeaderboardEntry[]> => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('users_clubs')
            .select(
                `
        user_id,
        points,
        users:user_id (
          username,
          avatar_url
        )
      `
            )
            .eq('club_id', clubId)
            .not('points', 'is', null)
            .order('points', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            throw new Error('Failed to fetch leaderboard');
        }

        // Transform data to LeaderboardEntry format
        return (
            data?.map((entry, index) => ({
                userId: entry.user_id,
                username: (entry.users as any)?.username || 'Unknown',
                avatarUrl: (entry.users as any)?.avatar_url || null,
                points: entry.points || 0,
                rank: index + 1,
            })) || []
        );
    }
);

/**
 * Get user's gamification summary for a club
 */
export async function getUserGamification(
    userId: string,
    clubId: string
): Promise<UserGamification> {
    const supabase = await createClient();

    // Get user points
    const totalPoints = await getUserPoints(userId, clubId);

    // Get leaderboard to calculate rank
    const leaderboard = await getClubLeaderboard(clubId, 100);
    const userRank =
        leaderboard.findIndex((entry) => entry.userId === userId) + 1;

    // Get available rewards
    const availableRewards = await getClubRewards(clubId);

    // TODO: Get achievements and earned rewards (tables to be created)

    return {
        userId,
        clubId,
        totalPoints,
        rank: userRank > 0 ? userRank : null,
        achievements: [], // TODO: Implement achievements
        rewardsEarned: [], // TODO: Implement claimed rewards
        availableRewards: availableRewards.filter(
            (r) => r.points_required <= totalPoints
        ),
    };
}

// ==========================================
// PLACEHOLDER FUNCTIONS (To be implemented)
// ==========================================

/**
 * Check and unlock achievements for a user
 * TODO: Implement once achievements system is defined
 */
export async function checkAchievements(
    userId: string,
    clubId: string
): Promise<void> {
    // Placeholder for future achievement system
    console.log(`Checking achievements for user ${userId} in club ${clubId}`);
}

/**
 * Log a points transaction
 * TODO: Implement once points_history table is created
 */
export async function logPointsTransaction(
    transaction: Omit<PointsTransaction, 'id' | 'createdAt'>
): Promise<void> {
    // Placeholder for future points history tracking
    console.log('Points transaction:', transaction);
}
