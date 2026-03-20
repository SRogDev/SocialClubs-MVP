import { createClient } from '@/lib/supabase/server'
import { retrieveClubRagContext } from '@/services/ragService'

export type ClubSqlToolQuery =
    | 'club_profile'
    | 'club_member_summary'
    | 'user_membership_preferences'

export async function runClubSqlTool(
    queryName: ClubSqlToolQuery,
    params: { clubId: string; userId?: string }
) {
    const supabase = await createClient()

    switch (queryName) {
        case 'club_profile': {
            const { data, error } = await supabase
                .from('clubs')
                .select('id, name, bio, level, total_members, tags, created_at')
                .eq('id', params.clubId)
                .single()

            if (error) {
                throw new Error(`club_profile failed: ${error.message}`)
            }

            return data
        }

        case 'club_member_summary': {
            const { count, error } = await supabase
                .from('users_clubs')
                .select('id', { count: 'exact', head: true })
                .eq('club_id', params.clubId)

            if (error) {
                throw new Error(`club_member_summary failed: ${error.message}`)
            }

            return { members: count ?? 0 }
        }

        case 'user_membership_preferences': {
            if (!params.userId) {
                throw new Error('userId is required for user_membership_preferences')
            }

            const { data, error } = await supabase
                .from('users_clubs')
                .select('role, points, created_at')
                .eq('club_id', params.clubId)
                .eq('user_id', params.userId)
                .single()

            if (error) {
                throw new Error(`user_membership_preferences failed: ${error.message}`)
            }

            return data
        }

        default:
            throw new Error('Unsupported SQL tool query')
    }
}

export async function retrieveClubKnowledgeTool(clubId: string, query: string) {
    const chunks = await retrieveClubRagContext(clubId, query, 5)
    return {
        chunks,
        usedRag: chunks.length > 0,
    }
}
