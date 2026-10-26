'use client';

/**
 * GamesStudio — creator surface for AI minigames.
 *
 * Create (prompt → POST /api/games/generate), review drafts (preview in a
 * sandboxed player, approve/reject) and manage published games (attach to
 * an event / detach). All state changes go through the /api/games routes;
 * this component only renders summaries — the HTML artifact arrives solely
 * as a session-bound playable document from the session route.
 */
import {
    Check,
    Eye,
    Gamepad2,
    Link2,
    Sparkles,
    Unlink,
    X,
} from 'lucide-react';
import { useState } from 'react';

import { GamePlayer } from '@/components/games/GamePlayer';
import {
    CAPABILITY_LABELS,
    STATUS_LABELS,
    type GameSummary,
} from '@/components/games/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClubEventOption {
    id: string;
    title: string;
}

interface GamesStudioProps {
    clubId: string;
    initialGames: GameSummary[];
    events: ClubEventOption[];
}

interface PreviewState {
    sessionId: string;
    html: string;
}

async function api(path: string, body?: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Algo salió mal');
    }
    return data;
}

export default function GamesStudio({ clubId, initialGames, events }: GamesStudioProps) {
    const [games, setGames] = useState<GameSummary[]>(initialGames);
    const [prompt, setPrompt] = useState('');
    const [createEventId, setCreateEventId] = useState('');
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [previews, setPreviews] = useState<Record<string, PreviewState | null>>({});
    const [attachEvent, setAttachEvent] = useState<Record<string, string>>({});

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        setMessage(null);
        try {
            const data = await api('/api/games/generate', {
                clubId,
                prompt: prompt.trim(),
                eventId: createEventId || null,
            });
            const game = data.game as GameSummary;
            // The generate response is a partial summary; refetch the full one.
            const detail = await api(`/api/games/${game.id}`).catch(() => null);
            const full = (detail?.game as GameSummary | undefined) ?? game;
            setGames((prev) => [full, ...prev]);
            setPrompt('');
            setMessage({
                kind: 'ok',
                text: game.validation && (game.validation as { ok: boolean }).ok
                    ? 'Minijuego creado como borrador. Revísalo y apruébalo para publicarlo.'
                    : 'Borrador creado, pero la validación encontró problemas. Revisa el detalle en la tarjeta antes de aprobar.',
            });
        } catch (err) {
            setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'No se pudo crear el minijuego.' });
        } finally {
            setCreating(false);
        }
    }

    async function handlePreview(game: GameSummary) {
        if (previews[game.id]) {
            setPreviews((p) => ({ ...p, [game.id]: null }));
            return;
        }
        setBusyId(game.id);
        setMessage(null);
        try {
            const data = await api(`/api/games/${game.id}/session`, { kind: 'preview' });
            setPreviews((p) => ({
                ...p,
                [game.id]: { sessionId: data.sessionId as string, html: data.html as string },
            }));
        } catch (err) {
            setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'No se pudo abrir la vista previa.' });
        } finally {
            setBusyId(null);
        }
    }

    async function handleReview(game: GameSummary, action: 'approve' | 'reject') {
        setBusyId(game.id);
        setMessage(null);
        try {
            const data = await api(`/api/games/${game.id}/review`, { action });
            const updated = data.game as GameSummary;
            setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
            setMessage({
                kind: 'ok',
                text: action === 'approve' ? 'Minijuego publicado.' : 'Minijuego rechazado.',
            });
        } catch (err) {
            setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'No se pudo completar la acción.' });
        } finally {
            setBusyId(null);
        }
    }

    async function handleAttach(game: GameSummary, eventId: string | null) {
        setBusyId(game.id);
        setMessage(null);
        try {
            const data = await api(`/api/games/${game.id}/attach`, { eventId });
            const updated = data.game as GameSummary;
            setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
            setMessage({
                kind: 'ok',
                text: eventId ? 'Minijuego vinculado al evento.' : 'Minijuego desvinculado.',
            });
        } catch (err) {
            setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'No se pudo vincular el juego.' });
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8 p-6">
            <div>
                <div className="flex items-center gap-2">
                    <Gamepad2 size={22} className="text-[#7C3AED]" aria-hidden />
                    <h1 className="text-2xl font-bold">Minijuegos IA</h1>
                </div>
                <p className="mt-2 text-muted-foreground">
                    Describe un juego corto para tu comunidad: la IA lo diseña, lo programa y lo
                    validamos antes de que puedas publicarlo. Nada llega a tus miembros sin tu
                    aprobación.
                </p>
            </div>

            {message && (
                <p
                    role="status"
                    className={
                        message.kind === 'ok'
                            ? 'rounded-lg border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-3 text-sm'
                            : 'rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm'
                    }
                >
                    {message.text}
                </p>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles size={18} className="text-[#7C3AED]" aria-hidden />
                        Crear un minijuego
                    </CardTitle>
                    <CardDescription>
                        Un juego por idea: una pantalla, una sesión corta, controles simples.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="game-prompt">Tu idea</Label>
                            <Textarea
                                id="game-prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                minLength={10}
                                maxLength={1000}
                                required
                                rows={4}
                                placeholder="Ej.: Un quiz de 5 preguntas sobre los últimos posts del club, con puntos por rapidez"
                                className="focus-visible:ring-[#7C3AED]"
                            />
                            <p className="text-xs text-muted-foreground">
                                {prompt.trim().length}/1000 caracteres (mínimo 10)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="game-event">Juego para un evento (opcional)</Label>
                            <select
                                id="game-event"
                                value={createEventId}
                                onChange={(e) => setCreateEventId(e.target.value)}
                                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                            >
                                <option value="">Sin evento — juego del club</option>
                                {events.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Button
                            type="submit"
                            disabled={creating || prompt.trim().length < 10}
                            className="min-h-11 bg-[#7C3AED] hover:bg-[#6D28D9]"
                        >
                            {creating ? 'Creando…' : 'Crear minijuego'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <section className="space-y-4" aria-label="Biblioteca de minijuegos">
                <h2 className="text-lg font-semibold">Biblioteca del club</h2>
                {games.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay minijuegos. Crea el primero con el formulario de arriba.
                    </p>
                ) : (
                    games.map((game) => (
                        <GameCard
                            key={game.id}
                            game={game}
                            events={events}
                            busy={busyId === game.id}
                            preview={previews[game.id] ?? null}
                            attachValue={attachEvent[game.id] ?? game.eventId ?? ''}
                            onAttachValueChange={(v) =>
                                setAttachEvent((s) => ({ ...s, [game.id]: v }))
                            }
                            onPreview={() => void handlePreview(game)}
                            onReview={(a) => void handleReview(game, a)}
                            onAttach={(eventId) => void handleAttach(game, eventId)}
                        />
                    ))
                )}
            </section>
        </div>
    );
}

function GameCard({
    game,
    events,
    busy,
    preview,
    attachValue,
    onAttachValueChange,
    onPreview,
    onReview,
    onAttach,
}: {
    game: GameSummary;
    events: ClubEventOption[];
    busy: boolean;
    preview: PreviewState | null;
    attachValue: string;
    onAttachValueChange: (v: string) => void;
    onPreview: () => void;
    onReview: (a: 'approve' | 'reject') => void;
    onAttach: (eventId: string | null) => void;
}) {
    const validationOk = game.validation?.ok === true;
    const attachedEvent = game.eventId ? events.find((e) => e.id === game.eventId) : undefined;

    return (
        <Card>
            <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{game.title}</CardTitle>
                    <Badge
                        className={
                            game.status === 'published'
                                ? 'bg-[#7C3AED] hover:bg-[#7C3AED]'
                                : undefined
                        }
                        variant={
                            game.status === 'rejected'
                                ? 'destructive'
                                : game.status === 'published'
                                  ? 'default'
                                  : 'secondary'
                        }
                    >
                        {STATUS_LABELS[game.status]}
                    </Badge>
                    {game.mock && <Badge variant="outline">Ejemplo sin IA</Badge>}
                </div>
                <CardDescription>{game.brief.description}</CardDescription>
                <p className="text-sm text-muted-foreground">
                    Tipo: {game.brief.gameType} · Sesión de {game.brief.sessionMinutes} min ·
                    Puntuación máx. {game.brief.maxScore}
                    {game.eventId
                        ? ` · Evento: ${attachedEvent?.title ?? 'vinculado'}`
                        : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {game.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="font-normal">
                            {CAPABILITY_LABELS[cap] ?? cap}
                        </Badge>
                    ))}
                </div>
                {game.validation ? (
                    validationOk ? (
                        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <Check size={16} aria-hidden /> Válido
                        </p>
                    ) : (
                        <div className="text-sm text-destructive">
                            <p className="font-medium">Validación con problemas:</p>
                            <ul className="list-disc pl-5">
                                {game.validation.violations.map((v, i) => (
                                    <li key={i}>
                                        {v.rule}: {v.detail}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                ) : (
                    <p className="text-sm text-muted-foreground">Sin reporte de validación.</p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        disabled={busy}
                        onClick={onPreview}
                    >
                        <Eye size={16} className="mr-1" aria-hidden />
                        {preview ? 'Ocultar vista previa' : 'Vista previa'}
                    </Button>
                    {game.status === 'draft' && (
                        <>
                            <Button
                                type="button"
                                className="min-h-11 bg-[#7C3AED] hover:bg-[#6D28D9]"
                                disabled={busy || !validationOk}
                                title={
                                    validationOk
                                        ? undefined
                                        : 'Solo se puede publicar un juego que pasó la validación'
                                }
                                onClick={() => onReview('approve')}
                            >
                                <Check size={16} className="mr-1" aria-hidden />
                                Aprobar y publicar
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="min-h-11"
                                disabled={busy}
                                onClick={() => onReview('reject')}
                            >
                                <X size={16} className="mr-1" aria-hidden />
                                Rechazar
                            </Button>
                        </>
                    )}
                </div>
                {game.status === 'draft' && !validationOk && (
                    <p className="text-xs text-muted-foreground">
                        Para publicar, el juego debe pasar la validación. Puedes previsualizarlo o
                        rechazarlo y crear uno nuevo.
                    </p>
                )}

                {game.status === 'published' && (
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-52 flex-1 space-y-1">
                            <Label htmlFor={`attach-${game.id}`}>Vincular a un evento</Label>
                            <select
                                id={`attach-${game.id}`}
                                value={attachValue}
                                onChange={(e) => onAttachValueChange(e.target.value)}
                                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                            >
                                <option value="">Elige un evento…</option>
                                {events.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            disabled={busy || !attachValue}
                            onClick={() => onAttach(attachValue)}
                        >
                            <Link2 size={16} className="mr-1" aria-hidden />
                            Vincular
                        </Button>
                        {game.eventId && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="min-h-11"
                                disabled={busy}
                                onClick={() => onAttach(null)}
                            >
                                <Unlink size={16} className="mr-1" aria-hidden />
                                Desvincular
                            </Button>
                        )}
                    </div>
                )}

                {preview && (
                    <GamePlayer
                        gameId={game.id}
                        sessionId={preview.sessionId}
                        html={preview.html}
                        title={game.title}
                    />
                )}
            </CardContent>
        </Card>
    );
}
