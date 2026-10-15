'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RsvpStatus } from '@/types/event';

interface RsvpButtonProps {
    eventId: string;
    initialRsvp: RsvpStatus | null;
    full: boolean;
}

const OPTIONS: { status: RsvpStatus; label: string }[] = [
    { status: 'going', label: 'Asistiré' },
    { status: 'interested', label: 'Me interesa' },
    { status: 'not_going', label: 'No asistiré' },
];

/** RSVP control for an event: three statuses + remove. Spanish-first. */
export function RsvpButton({ eventId, initialRsvp, full }: RsvpButtonProps) {
    const router = useRouter();
    const [rsvp, setRsvp] = useState<RsvpStatus | null>(initialRsvp);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function send(status: RsvpStatus) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/events/${eventId}/rsvp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Error registrando asistencia');
            setRsvp(status);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error registrando asistencia');
        } finally {
            setLoading(false);
        }
    }

    async function remove() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/events/${eventId}/rsvp`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Error cancelando asistencia');
            setRsvp(null);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error cancelando asistencia');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {OPTIONS.map(({ status, label }) => {
                    const active = rsvp === status;
                    const disabled = loading || (status === 'going' && full && !active);
                    return (
                        <Button
                            key={status}
                            variant={active ? 'default' : 'outline'}
                            size="sm"
                            disabled={disabled}
                            onClick={() => send(status)}
                            className={cn(active && 'gap-1.5')}
                        >
                            {active && <Check size={14} />}
                            {label}
                        </Button>
                    );
                })}
                {rsvp && (
                    <Button variant="ghost" size="sm" disabled={loading} onClick={remove}>
                        <X size={14} className="mr-1" />
                        Quitar
                    </Button>
                )}
            </div>
            {full && !rsvp && (
                <p className="text-sm text-muted-foreground">El evento está lleno.</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
