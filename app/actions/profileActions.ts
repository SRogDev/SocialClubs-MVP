'use server'

/**
 * Profile Actions - Server Actions para mutaciones de perfiles de usuario
 * Patrón Repository: Actions llaman a services, services contienen CRUD
 */

import { revalidatePath } from 'next/cache'

import { uploadToImageKit, IK_FOLDERS } from '@/lib/imagekit'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema, type UpdateProfileInput } from '@/schemas/profileSchema'
import { updateUserProfile } from '@/services/userService'
import type { User } from '@/types/user'

/**
 * Update user profile
 */
export async function updateProfileAction(
    input: UpdateProfileInput
): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
        // Validate input
        const validated = updateProfileSchema.parse(input)

        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Check if username is being changed and if it's available
        if (validated.username) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', validated.username)
                .neq('id', user.id)
                .single()

            if (existingUser) {
                return {
                    success: false,
                    error: 'El nombre de usuario ya está en uso',
                }
            }
        }

        // Update profile
        const updatedProfile = await updateUserProfile(user.id, validated)

        // Revalidate paths
        revalidatePath('/profile')
        if (validated.username) {
            revalidatePath(`/profile/${validated.username}`)
        }

        return { success: true, data: updatedProfile }
    } catch (error) {
        console.error('Error updating profile:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al actualizar el perfil',
        }
    }
}

/**
 * Upload profile image
 */
export async function uploadProfileImageAction(
    file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
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

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'El archivo debe ser una imagen' }
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return {
                success: false,
                error: 'La imagen no debe superar los 5MB',
            }
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop() || 'jpg'
        const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`

        // Upload to ImageKit
        const { url: publicUrl } = await uploadToImageKit(
            file,
            fileName,
            IK_FOLDERS.avatars
        )

        // Update user profile with new image URL
        await updateUserProfile(user.id, { avatar_url: publicUrl })

        // Revalidate paths
        revalidatePath('/profile')

        return { success: true, url: publicUrl }
    } catch (error) {
        console.error('Error uploading profile image:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al subir la imagen',
        }
    }
}


