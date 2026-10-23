/**
 * Shared helpers for the /api/games/* routes (minigame runtime surface).
 *
 * Every route in this surface is gated by AI_MINIGAME_RUNTIME (404 when
 * off), requires an authenticated user (401) and checks club roles through
 * lib/authz (403 via AuthorizationError). The playable HTML is NEVER
 * serialized here — summaries strip `html`; the only path that returns a
 * playable document is POST /api/games/[id]/session, bound to a session.
 */
import { NextResponse } from 'next/server';

import { AI_MINIGAME_RUNTIME, isEnabled } from '@/lib/ai/flags';
import type { GameRow } from '@/lib/games/service';
import { createClient } from '@/lib/supabase/server';

/** 404 response when the minigame runtime flag is off, else null. */
export function gamesDisabledResponse(): NextResponse | null {
    if (!isEnabled(AI_MINIGAME_RUNTIME)) {
        return NextResponse.json(
            { error: 'Los minijuegos no están activados en este servidor.' },
            { status: 404 },
        );
    }
    return null;
}

/** Authenticated user or a ready-to-return 401 response. */
export async function requireUser(): Promise<
    { user: { id: string }; response: null } | { user: null; response: NextResponse }
> {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return {
            user: null,
            response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
        };
    }
    return { user: { id: user.id }, response: null };
}

/** Public summary of a game — everything except the raw HTML artifact. */
export function gameSummary(game: GameRow) {
    return {
        id: game.id,
        clubId: game.clubId,
        eventId: game.eventId,
        postId: game.postId,
        createdBy: game.createdBy,
        createdByAgent: game.createdByAgent,
        title: game.title,
        prompt: game.prompt,
        status: game.status,
        brief: game.brief,
        capabilities: game.capabilities,
        validation: game.validation,
        mock: game.mock,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
    };
}

export type GameSummary = ReturnType<typeof gameSummary>;
