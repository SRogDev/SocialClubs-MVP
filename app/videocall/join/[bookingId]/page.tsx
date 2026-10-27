import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { createDailyRoom } from '@/services/videocallService';

interface JoinVideocallPageProps {
    params: Promise<{
        bookingId: string;
    }>;
}

function JoinMessage({ title, message }: { title: string; message: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">{title}</h1>
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

/**
 * GET /videocall/join/<bookingId>
 * On-demand videocall entry point (replaces the old 5-minute cron).
 *
 * When a participant opens this page, the Daily.co room is created right
 * then — if one does not already exist for the booking — and the user is
 * redirected to it. Room creation is idempotent: createDailyRoom returns
 * the existing room when call_room_created is already set, so two people
 * joining at the same time end up in the same room. Expiry is computed
 * from join time (now + appointment duration), which is why creation must
 * happen at join time, not at booking time.
 *
 * Authorization mirrors POST /api/videocall/create-room: the booking user
 * or the club creator.
 */
export default async function JoinVideocallPage({ params }: JoinVideocallPageProps) {
    const resolvedParams = await params;
    const bookingId = parseInt(resolvedParams.bookingId);

    if (isNaN(bookingId)) {
        return <JoinMessage title="Reserva no encontrada" message="El identificador de la reserva no es válido." />;
    }

    // Authenticate user
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/auth/login');
    }

    // Verify booking exists and user is authorized (booking user or club creator)
    const { data: booking } = await supabase
        .from('users_agendas')
        .select('user_id, status, club:clubs(creator)')
        .eq('id', bookingId)
        .single();

    if (!booking) {
        return <JoinMessage title="Reserva no encontrada" message="Esta reserva no existe." />;
    }

    const isAuthorized = booking.user_id === user.id || (booking.club as any)?.creator === user.id;

    if (!isAuthorized) {
        return (
            <JoinMessage
                title="Acceso Denegado"
                message="No tienes permiso para unirte a esta videollamada."
            />
        );
    }

    if (booking.status !== 'confirmed') {
        return (
            <JoinMessage
                title="Reserva no confirmada"
                message="Esta videollamada todavía no está confirmada."
            />
        );
    }

    // Create the room on demand (idempotent: returns the existing room if
    // one was already created for this booking), then join it.
    const room = await createDailyRoom(bookingId);

    redirect(`/videocall/${room.id}`);
}
