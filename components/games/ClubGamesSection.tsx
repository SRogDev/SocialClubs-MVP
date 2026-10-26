'use client';

/**
 * ClubGamesSection — published minigames on the club home / event page.
 *
 * Renders a grid of published game cards; "Jugar" starts a play session
 * (POST /api/games/[id]/session) and mounts the GamePlayer plus the
 * leaderboard below. In event context the leaderboard is event-scoped via
 * the game's own event binding (the session carries it server-side).
 */
import { Gamepad2, Play, X } from 'lucide-react';
import { useState } from 'react';

import { GameLeaderboard } from '@/components/games/GameLeaderboard';
import { GamePlayer } from '@/components/games/GamePlayer';
import type { GameSummary } from '@/components/games/types';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

interface ClubGamesSectionProps {
    games: GameSummary[];
    /** Event context when rendered on an event page. */
    eventId?: string | null;
}

interface ActivePlay {
    game: GameSummary;
    sessionId: string;
    html: string;
}

export function ClubGamesSection({ games, eventId }: ClubGamesSectionProps) {
    const [active, setActive] = useState<ActivePlay | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [boardKey, setBoardKey] = useState(0);

    if (games.length === 0) return null;

    async function handlePlay(game: GameSummary) {
        if (active?.game.id === game.id) {
            setActive(null);
            return;
        }
        setLoadingId(game.id);
        setError(null);
        try {
            const res = await fetch(`/api/games/${game.id}/session`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind: 'play' }),
            });
            const data = (await res.json().catch(() => ({}))) as {
                sessionId?: string;
                html?: string;
                error?: string;
            };
            if (!res.ok || !data.sessionId || !data.html) {
                throw new Error(data.error ?? 'No se pudo iniciar el juego.');
            }
            setActive({ game, sessionId: data.sessionId, html: data.html });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo iniciar el juego.');
        } finally {
            setLoadingId(null);
        }
    }

    function handleClose() {
        setActive(null);
        setBoardKey((k) => k + 1);
    }

    return (
        <section aria-label="Minijuegos" className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Gamepad2 size={20} className="text-[#7C3AED]" aria-hidden />
                Minijuegos
            </h2>

            {error && (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                    {error}
                </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                {games.map((game) => {
                    const isActive = active?.game.id === game.id;
                    return (
                        <Card key={game.id} className={isActive ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/30' : undefined}>
                            <CardHeader className="space-y-1 pb-2">
                                <CardTitle className="text-base">{game.title}</CardTitle>
                                <CardDescription>{game.brief.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    {game.brief.gameType} · {game.brief.sessionMinutes} min · hasta{' '}
                                    {game.brief.maxScore} pts
                                </p>
                                <Button
                                    type="button"
                                    className="min-h-11 bg-[#7C3AED] hover:bg-[#6D28D9] focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                                    disabled={loadingId === game.id}
                                    onClick={() => void handlePlay(game)}
                                >
                                    <Play size={16} className="mr-1" aria-hidden />
                                    {loadingId === game.id ? 'Cargando…' : isActive ? 'Cerrar' : 'Jugar'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {active && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold">{active.game.title}</h3>
                        <Button
                            type="button"
                            variant="ghost"
                            className="min-h-11"
                            onClick={handleClose}
                        >
                            <X size={16} className="mr-1" aria-hidden />
                            Cerrar
                        </Button>
                    </div>
                    <GamePlayer
                        gameId={active.game.id}
                        sessionId={active.sessionId}
                        html={active.html}
                        title={active.game.title}
                    />
                    <GameLeaderboard
                        gameId={active.game.id}
                        eventId={active.game.eventId ?? eventId ?? null}
                        refreshKey={boardKey}
                    />
                </div>
            )}
        </section>
    );
}
