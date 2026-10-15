import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PhaseBadge } from '@/components/events/PhaseBadge';
import { RsvpButton } from '@/components/events/RsvpButton';
import { formatEventRange } from '@/components/events/event-date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getEvent } from '@/services/eventService';
import { eventPhase } from '@/types/event';

interface PageProps {
    params: Promise<{ id: string; eventId: string }>;
}

/** Event detail: phase badge, timezone-aware dates, capacity, RSVP. */
export default async function EventDetailPage({ params }: PageProps) {
    const { id, eventId } = await params;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) notFound();

    const event = await getEvent(eventId, user.id);
    if (!event || event.club_id !== id) notFound();

    const phase = eventPhase(event);
    const full = event.capacity !== null && event.attendee_count >= event.capacity;

    return (
        <div className="container py-6 space-y-6 max-w-2xl mx-auto">
            <Link
                href={`/clubs/${id}/eventos`}
                className="flex items-center text-muted-foreground hover:text-foreground group"
            >
                <ArrowLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm">Volver a eventos</span>
            </Link>

            <Card>
                <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <PhaseBadge phase={phase} />
                        {event.status === 'cancelled' && (
                            <span className="text-sm font-medium text-destructive">Cancelado</span>
                        )}
                        {event.status === 'draft' && (
                            <span className="text-sm text-muted-foreground">Borrador</span>
                        )}
                    </div>
                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                            <CalendarDays size={16} className="shrink-0 text-muted-foreground" />
                            {formatEventRange(event.starts_at, event.ends_at, event.timezone)}
                        </p>
                        <p className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={16} className="shrink-0" />
                            {event.timezone}
                        </p>
                        <p className="flex items-center gap-2 text-muted-foreground">
                            <Users size={16} className="shrink-0" />
                            {event.attendee_count} asistente{event.attendee_count === 1 ? '' : 's'}
                            {event.capacity ? ` de ${event.capacity}` : ' · sin límite de cupo'}
                        </p>
                    </div>

                    {event.description && (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {event.description}
                        </p>
                    )}

                    {event.status !== 'cancelled' && phase !== 'EXPIRED' && (
                        <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-2">¿Asistes?</p>
                            <RsvpButton
                                eventId={event.id}
                                initialRsvp={event.my_rsvp ?? null}
                                full={full}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
