import { CalendarDays, Users } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { eventPhase, type ClubEvent } from '@/types/event';

import { formatEventDate } from './event-date';
import { PhaseBadge } from './PhaseBadge';

interface EventCardProps {
    clubId: string;
    event: ClubEvent & { attendee_count?: number };
}

/** Compact event card for the club's event list. */
export function EventCard({ clubId, event }: EventCardProps) {
    const phase = eventPhase(event);
    return (
        <Link href={`/clubs/${clubId}/eventos/${event.id}`} className="block">
            <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <PhaseBadge phase={phase} />
                            {event.status === 'cancelled' && (
                                <span className="text-xs font-medium text-destructive">
                                    Cancelado
                                </span>
                            )}
                        </div>
                        <h3 className="truncate font-semibold leading-tight">{event.title}</h3>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CalendarDays size={14} className="shrink-0" />
                            {formatEventDate(event.starts_at, event.timezone)}
                        </p>
                        {typeof event.attendee_count === 'number' && (
                            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Users size={14} className="shrink-0" />
                                {event.attendee_count} asistente{event.attendee_count === 1 ? '' : 's'}
                                {event.capacity ? ` / ${event.capacity}` : ''}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
