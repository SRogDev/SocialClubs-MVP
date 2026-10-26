'use client';

/**
 * GameLeaderboard — best-score ranking for a game, fetched from
 * GET /api/games/[id]/leaderboard (event scope when eventId is given).
 * Refetches when `refreshKey` changes (e.g. after a play session ends).
 */
import { Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

import type { LeaderboardEntry } from './types';

interface GameLeaderboardProps {
    gameId: string;
    eventId?: string | null;
    refreshKey?: number;
}

export function GameLeaderboard({ gameId, eventId, refreshKey = 0 }: GameLeaderboardProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setEntries(null);
        setFailed(false);
        const qs = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
        fetch(`/api/games/${gameId}/leaderboard${qs}`, { credentials: 'same-origin' })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
            .then((body: { entries?: LeaderboardEntry[] }) => {
                if (!cancelled) setEntries(body.entries ?? []);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [gameId, eventId, refreshKey]);

    return (
        <section aria-label="Clasificación" className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Trophy size={16} className="text-[#7C3AED]" aria-hidden />
                Clasificación
            </h3>

            {entries === null && !failed && (
                <div className="space-y-2" aria-busy="true">
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-11 w-3/4" />
                </div>
            )}

            {failed && (
                <p className="text-sm text-muted-foreground">
                    No se pudo cargar la clasificación.
                </p>
            )}

            {entries !== null && entries.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Aún no hay puntuaciones. ¡Sé la primera persona en jugar!
                </p>
            )}

            {entries !== null && entries.length > 0 && (
                <ol className="divide-y rounded-xl border bg-card">
                    {entries.map((entry, i) => (
                        <li key={entry.userId} className="flex min-h-11 items-center gap-3 px-3 py-2">
                            <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                                {i + 1}
                            </span>
                            <Avatar className="h-8 w-8 shrink-0">
                                {entry.avatarUrl ? (
                                    <AvatarImage src={entry.avatarUrl} alt="" />
                                ) : null}
                                <AvatarFallback>
                                    {(entry.displayName || 'M').slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {entry.displayName}
                            </span>
                            <span className="shrink-0 text-sm font-bold text-[#7C3AED]">
                                {entry.score}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
