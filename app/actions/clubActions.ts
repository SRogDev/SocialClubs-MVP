'use server'

/**
 * Club Actions - Server Actions para mutaciones de clubs
 * Patrón Repository: Actions llaman a services, services contienen CRUD
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateClub, joinClub, leaveClub } from '@/services/clubService'
import { updateClubSchema, type UpdateClubInput } from '@/schemas/clubSchema'
import type { Club } from '@/types/club'

/**
 * Update club information
 */
export async function updateClubAction(
    clubId: string,
    input: UpdateClubInput
): Promise<{ success: boolean; data?: Club; error?: string }> {
    try {
        // Validate input
        const validated = updateClubSchema.parse(input)

        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify user is club creator
        const { data: club } = await supabase
            .from('clubs')
            .select('creator')
            .eq('id', clubId)
            .single()

        if (!club || club.creator !== user.id) {
            return {
                success: false,
                error: 'No tienes permisos para actualizar este club',
            }
        }

        // Call service (Repository pattern)
        const updatedClub = await updateClub(clubId, validated)

        // Revalidate paths
        revalidatePath(`/clubs/${clubId}`)
        revalidatePath(`/clubs/${clubId}/panel`)
        revalidatePath('/clubs')

        return { success: true, data: updatedClub }
    } catch (error) {
        console.error('Error updating club:', error)
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Error al actualizar el club',
        }
    }
}

/**
 * Join a club
 */
export async function joinClubAction(
    clubId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Check if user is already a member
        const { data: existingMembership } = await supabase
            .from('users_clubs')
            .select('id')
            .eq('user_id', user.id)
            .eq('club_id', clubId)
            .single()

        if (existingMembership) {
            return { success: false, error: 'Ya eres miembro de este club' }
        }

        // Join club
        await joinClub(user.id, clubId)

        // Revalidate paths
        revalidatePath(`/clubs/${clubId}`)
        revalidatePath('/clubs')
        revalidatePath('/home-clubs')

        return { success: true }
    } catch (error) {
        console.error('Error joining club:', error)
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Error al unirse al club',
        }
    }
}

/**
 * Leave a club
 */
export async function leaveClubAction(
    clubId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify user is a member
        const { data: club } = await supabase
            .from('clubs')
            .select('creator')
            .eq('id', clubId)
            .single()

        // Don't allow creator to leave
        if (club && club.creator === user.id) {
            return {
                success: false,
                error: 'El creador no puede abandonar el club. Debes eliminarlo.',
            }
        }

        // Leave club
        await leaveClub(user.id, clubId)

        // Revalidate paths
        revalidatePath(`/clubs/${clubId}`)
        revalidatePath('/clubs')
        revalidatePath('/home-clubs')

        return { success: true }
    } catch (error) {
        console.error('Error leaving club:', error)
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Error al salir del club',
        }
    }
}


