/**
 * Authentication Service - Auth operations using Supabase
 */

import { createClient } from '@/lib/supabase/server'
import { signInSchema, signUpSchema, resetPasswordSchema, updatePasswordSchema, type SignInInput, type SignUpInput, type ResetPasswordInput, type UpdatePasswordInput } from '@/schemas/authSchema'

/**
 * Sign in with email and password
 */
export async function signIn(input: SignInInput) {
    // Validate input
    const validated = signInSchema.parse(input)

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
    })

    if (error) {
        console.error('Error signing in:', error)
        throw new Error('Invalid email or password')
    }

    // NUEVO: Verificar si hay un invite code pendiente
    if (typeof window !== 'undefined') {
        const inviteCode = sessionStorage.getItem('club_invite_code');

        if (inviteCode) {
            try {
                // Buscar el club por el invite code
                const { data: club } = await supabase
                    .from('clubs')
                    .select('id, creator')
                    .eq('club_link', inviteCode)
                    .single();

                if (club) {
                    // Verificar si ya es miembro
                    const { data: existingMembership } = await supabase
                        .from('users_clubs')
                        .select('id')
                        .eq('user_id', data.user.id)
                        .eq('club_id', club.id)
                        .single();

                    if (!existingMembership) {
                        // Unirse al club
                        await supabase
                            .from('users_clubs')
                            .insert({
                                user_id: data.user.id,
                                club_id: club.id,
                                role: 'member',
                                invite_code: inviteCode,
                            });

                        // Crear entrada en referrals
                        await supabase
                            .from('referrals')
                            .insert({
                                referrer_id: club.creator,
                                referral_id: data.user.id,
                                club_id: club.id,
                            });

                        // Incrementar contador
                        await supabase.rpc('increment_club_members', { club_uuid: club.id });
                    }

                    // Limpiar el invite code
                    sessionStorage.removeItem('club_invite_code');
                }
            } catch (error) {
                console.error('Error processing invite code on login:', error);
            }
        }
    }

    return data
}

/**
 * Sign up with email, password, and name
 */
export async function signUp(input: SignUpInput) {
    // Validate input
    const validated = signUpSchema.parse(input)

    const supabase = await createClient()

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
            data: {
                name: validated.name,
                username: validated.username,
            },
        },
    })

    if (error) {
        console.error('Error signing up:', error)
        throw new Error('Failed to create account')
    }

    // Create user profile in users table
    if (data.user) {
        const { error: profileError } = await supabase
            .from('users')
            .insert({
                id: data.user.id,
                name: validated.name,
                username: validated.username,
                avatar_url: null,
                bio: null,
                is_member: false,
            })

        if (profileError) {
            console.error('Error creating user profile:', profileError)
            // Note: The auth user is already created at this point
            // You may want to implement a cleanup mechanism
        }

        // Initialize user points
        await supabase
            .from('usersPoints')
            .insert({
                user: data.user.id,
                superlikes: 10, // Default starting superlikes
            })

        // NUEVO: Verificar si hay un invite code pendiente
        if (typeof window !== 'undefined') {
            const inviteCode = sessionStorage.getItem('club_invite_code');

            if (inviteCode) {
                try {
                    // Buscar el club por el invite code
                    const { data: club } = await supabase
                        .from('clubs')
                        .select('id, creator')
                        .eq('club_link', inviteCode)
                        .single();

                    if (club) {
                        // Unirse al club automáticamente
                        await supabase
                            .from('users_clubs')
                            .insert({
                                user_id: data.user.id,
                                club_id: club.id,
                                role: 'member',
                                invite_code: inviteCode,
                            });

                        // Crear entrada en referrals (referrer_id es el creator del club)
                        await supabase
                            .from('referrals')
                            .insert({
                                referrer_id: club.creator,
                                referral_id: data.user.id,
                                club_id: club.id,
                            });

                        // Incrementar contador de miembros
                        await supabase.rpc('increment_club_members', { club_uuid: club.id });

                        // Limpiar el invite code
                        sessionStorage.removeItem('club_invite_code');
                    }
                } catch (error) {
                    console.error('Error processing invite code:', error);
                    // No fallar el sign-up, solo logear el error
                }
            }
        }
    }

    return data
}

/**
 * Sign out
 */
export async function signOut() {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
        console.error('Error signing out:', error)
        throw new Error('Failed to sign out')
    }
}

/**
 * Request password reset
 */
export async function resetPassword(input: ResetPasswordInput) {
    // Validate input
    const validated = resetPasswordSchema.parse(input)

    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
    })

    if (error) {
        console.error('Error requesting password reset:', error)
        throw new Error('Failed to send password reset email')
    }
}

/**
 * Update password (after reset)
 */
export async function updatePassword(input: UpdatePasswordInput) {
    // Validate input
    const validated = updatePasswordSchema.parse(input)

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: validated.newPassword,
    })

    if (error) {
        console.error('Error updating password:', error)
        throw new Error('Failed to update password')
    }
}

/**
 * Get current session
 */
export async function getSession() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getSession()

    if (error) {
        console.error('Error getting session:', error)
        return null
    }

    return data.session
}

/**
 * Get current authenticated user
 */
export async function getAuthUser() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()

    if (error) {
        console.error('Error getting user:', error)
        return null
    }

    return data.user
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'discord') {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
    })

    if (error) {
        console.error('Error signing in with OAuth:', error)
        throw new Error('Failed to sign in with OAuth')
    }

    return data
}
