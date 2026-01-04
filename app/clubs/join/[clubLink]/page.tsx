import { redirect } from 'next/navigation';
import { getClubByLink } from '@/services/clubService';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
    params: Promise<{ clubLink: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClubJoinPage({ params }: PageProps) {
    const { clubLink } = await params;

    // 1. Validar que el club existe
    const club = await getClubByLink(clubLink);

    if (!club) {
        // Club no existe - redirigir a explore
        redirect('/explore?error=club_not_found');
    }

    // 2. Verificar si el usuario está autenticado
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // Usuario NO autenticado - redirigir a signup con el invite code en la URL
        // El hook useClubInvite capturará el parámetro ?invite
        redirect(`/auth/signup?invite=${clubLink}`);
    }

    // 3. Usuario autenticado - intentar unirse automáticamente
    const userId = session.user.id;

    try {
        // Verificar si ya es miembro
        const { data: membership } = await supabase
            .from('users_clubs')
            .select('id')
            .eq('user_id', userId)
            .eq('club_id', club.id)
            .single();

        if (membership) {
            // Ya es miembro - redirigir al club
            redirect(`/home-clubs/${club.id}`);
        }

        // No es miembro - unirse automáticamente
        // Guardar el invite_code (clubLink) en users_clubs para tracking
        await supabase
            .from('users_clubs')
            .insert({
                user_id: userId,
                club_id: club.id,
                role: 'member',
                invite_code: clubLink, // Track quién invitó
            });

        // Crear entrada en referrals (referrer_id es el creator del club)
        await supabase
            .from('referrals')
            .insert({
                referrer_id: club.creator,
                referral_id: userId,
                club_id: club.id,
            });

        // Incrementar contador de miembros
        await supabase.rpc('increment_club_members', { club_uuid: club.id });

        // Redirigir al club
        redirect(`/home-clubs/${club.id}?joined=true`);
    } catch (error) {
        console.error('Error joining club via invite:', error);
        redirect(`/explore?error=join_failed`);
    }
}