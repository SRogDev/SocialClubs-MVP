'use server'

import { createClient } from '@/lib/supabase/server'
import {
    generateGuestEmail,
    generateRandomPassword,
    generateFakeProfileData,
} from '@/services/auth/guestService'

/**
 * Crea una cuenta guest completa (server action).
 * 1. Crea auth user en Supabase Auth
 * 2. Crea perfil en tabla public.users
 * 3. Inicializa usersPoints
 */
export async function signInAsGuest(): Promise<{
    success: boolean
    userId?: string
    error?: string
}> {
    try {
        const supabase = await createClient()

        // 1. Generar credenciales
        const email = generateGuestEmail()
        const password = generateRandomPassword()
        const profileData = generateFakeProfileData()

        // 2. Crear auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: profileData.name,
                    username: profileData.username,
                },
            },
        })

        if (authError || !authData.user) {
            console.error('Error creating guest auth user:', authError)
            return { success: false, error: authError?.message || 'Failed to create guest account' }
        }

        const userId = authData.user.id

        // 3. Crear perfil en public.users
        const { error: profileError } = await supabase.from('users').insert({
            id: userId,
            name: profileData.name,
            username: profileData.username,
            bio: profileData.bio,
            avatar_url: null,
            is_member: false,
        })

        if (profileError) {
            console.error('Error creating guest profile:', profileError)
            return { success: false, error: 'Failed to create guest profile' }
        }

        // 4. Inicializar usersPoints (10 superlikes)
        const { error: pointsError } = await supabase.from('usersPoints').insert({
            user: userId,
            superlikes: 10,
        })

        if (pointsError) {
            console.error('Error initializing guest points:', pointsError)
            // No es crítico, continuar
        }

        // 5. Auto sign-in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (signInError) {
            console.error('Error signing in guest:', signInError)
            return { success: false, error: 'Failed to sign in guest' }
        }

        return { success: true, userId }
    } catch (error) {
        console.error('Unexpected error in signInAsGuest:', error)
        return { success: false, error: 'Unexpected error occurred' }
    }
}
