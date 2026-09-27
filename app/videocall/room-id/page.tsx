import { redirect } from 'next/navigation';

import { DailyVideoContainer } from '@/components/videocall/daily-video-container';
import { createClient } from '@/lib/supabase/server';
import { getRoomById } from '@/services/videocallService';

interface VideocallPageProps {
    params: {
        'room-id': string;
    };
}

export default async function VideocallPage({ params }: VideocallPageProps) {
    const roomId = parseInt(params['room-id']);

    if (isNaN(roomId)) {
        redirect('/');
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

    // Get room details
    const room = await getRoomById(roomId);

    if (!room) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Videollamada no encontrada</h1>
                    <p className="text-muted-foreground">Esta videollamada no existe o ya finalizó.</p>
                </div>
            </div>
        );
    }

    // Verify user is authorized (member or creator)
    if (room.user_id !== user.id && room.creator_id !== user.id) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
                    <p className="text-muted-foreground">No tienes permiso para unirte a esta videollamada.</p>
                </div>
            </div>
        );
    }

    // Check if room is still active
    if (room.status !== 'active') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Videollamada Finalizada</h1>
                    <p className="text-muted-foreground">
                        Esta videollamada ya finalizó (status: {room.status}).
                    </p>
                </div>
            </div>
        );
    }

    // Check if room has expired
    const now = new Date();
    const expiresAt = new Date(room.expires_at);
    if (now > expiresAt) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Videollamada Expirada</h1>
                    <p className="text-muted-foreground">
                        Esta videollamada expiró el {expiresAt.toLocaleString()}.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <main className="h-screen w-screen">
            <DailyVideoContainer
                roomUrl={room.link}
                roomId={room.id}
                userId={user.id}
                userName={user.user_metadata?.name || user.email || 'Usuario'}
            />
        </main>
    );
}
