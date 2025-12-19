/**
 * SWR Hooks Index - Centralized export of all SWR hooks
 * 
 * ⚠️ IMPORTANTE: Estos hooks NO hacen CRUD directamente a Supabase
 * 
 * Flujo correcto:
 * Hook SWR → fetch('/api/...') → API Route → Service (Repository) → Supabase
 * 
 * - Hooks SWR: SOLO para FETCH (GET)
 * - Mutaciones: Usar Server Actions en /app/actions
 */

// Club Data Hooks
export {
    useClubs,
    useClub,
    useUserClubs,
    useClubStats,
    useClubMembers,
    useIsMember,
    useFeaturedClubs,
} from './useClubData'

// Post Data Hooks
export {
    useClubPosts,
    usePost,
    usePostStats,
    usePostComments,
    useUserPostInteractions,
    useUserPosts,
    useTrendingPosts,
} from './usePostData'

// User Data Hooks
export {
    useCurrentUser,
    useUser,
    useUserByUsername,
    useUserPoints,
    useUserMemberships,
    // useUsernameAvailability - ELIMINADO: Supabase maneja unicidad del username
} from './useUserData'

// Admin Data Hooks
export {
    useAdminMetrics,
    useAdminClubs,
    useClubsWithReports,
    useMarketingStats,
} from './useAdminData'
