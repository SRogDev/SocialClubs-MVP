import { createClient } from '@/lib/supabase/server';

/**
 * Genera un email único para usuario guest
 * Formato: guest_<randomId>@temp.socialclubs.com
 */
export function generateGuestEmail(): string {
    const randomId = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    return `guest_${randomId}@temp.socialclubs.com`;
}

/**
 * Genera una contraseña aleatoria segura
 */
export function generateRandomPassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * Genera datos fake para el perfil guest
 * Nombres creativos y usernames únicos
 */
export function generateFakeProfileData() {
    const adjectives = ['Happy', 'Creative', 'Curious', 'Friendly', 'Cool', 'Smart', 'Bold', 'Brave'];
    const nouns = ['Explorer', 'Visitor', 'Guest', 'Traveler', 'Wanderer', 'Observer'];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 9999);

    return {
        name: `${randomAdjective} ${randomNoun}`,
        username: `guest_${randomNumber}_${Date.now().toString(36)}`,
        bio: 'Exploring SocialClubs as a guest 🌟',
    };
}

/**
 * Crea una cuenta guest completa
 * 1. Crea auth user en Supabase Auth
 * 2. Crea perfil en tabla public.users
 * 3. Inicializa usersPoints
 */
export async function signInAsGuest(): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
        const supabase = await createClient();

        // 1. Generar credenciales
        const email = generateGuestEmail();
        const password = generateRandomPassword();
        const profileData = generateFakeProfileData();

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
        });

        if (authError || !authData.user) {
            console.error('Error creating guest auth user:', authError);
            return { success: false, error: authError?.message || 'Failed to create guest account' };
        }

        const userId = authData.user.id;

        // 3. Crear perfil en public.users
        const { error: profileError } = await supabase
            .from('users')
            .insert({
                id: userId,
                name: profileData.name,
                username: profileData.username,
                bio: profileData.bio,
                avatar_url: null,
                is_member: false,
            });

        if (profileError) {
            console.error('Error creating guest profile:', profileError);
            return { success: false, error: 'Failed to create guest profile' };
        }

        // 4. Inicializar usersPoints (10 superlikes)
        const { error: pointsError } = await supabase
            .from('usersPoints')
            .insert({
                user: userId,
                superlikes: 10,
            });

        if (pointsError) {
            console.error('Error initializing guest points:', pointsError);
            // No es crítico, continuar
        }

        // 5. Auto sign-in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            console.error('Error signing in guest:', signInError);
            return { success: false, error: 'Failed to sign in guest' };
        }

        return { success: true, userId };
    } catch (error) {
        console.error('Unexpected error in signInAsGuest:', error);
        return { success: false, error: 'Unexpected error occurred' };
    }
}