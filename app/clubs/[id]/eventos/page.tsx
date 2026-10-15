import { ArrowLeft, CalendarX } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { EventCard } from '@/components/events/EventCard';
import { requireClubRole } from '@/lib/authz';
import { createClient } from '@/lib/supabase/server';
import { getClubById } from '@/services/clubService';
import { listClubEvents } from '@/services/eventService';

interface PageProps {
    params: Promise<{ id: string }>;
}

/** Club events list: phase badges (Próximo / En vivo / Finalizado). */
export default async function ClubEventsPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) notFound();

    const club = await getClubById(id);
    if (!club) notFound();

    let canManage = false;
    try {
        await requireClubRole(user.id, id, ['owner', 'admin']);
        canManage = true;
    } catch {
        canManage = false;
    }

    const events = await listClubEvents(id);

    return (
        <div className="container py-6 space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <Link
                    href={`/clubs/${id}`}
                    className="flex items-center text-muted-foreground hover:text-foreground group"
                >
                    <ArrowLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm">Volver al club</span>
                </Link>
                {canManage && <CreateEventDialog clubId={id} />}
            </div>

            <div>
                <h1 className="text-2xl font-bold">Eventos</h1>
                <p className="text-sm text-muted-foreground">
                    {club.name} · {events.length} evento{events.length === 1 ? '' : 's'}
                </p>
            </div>

            {events.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <CalendarX size={40} className="text-muted-foreground" />
                    <p className="text-muted-foreground">Todavía no hay eventos en este club.</p>
                    {canManage && (
                        <p className="text-sm text-muted-foreground">
                            Usa «Crear evento» para organizar el primero.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((event) => (
                        <EventCard key={event.id} clubId={id} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}
