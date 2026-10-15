/**
 * Sentient UI — live update channel (master plan Phases 58-62).
 *
 * After `dispatchSignal` persists a club-level signal (lib/ai/signal-dispatch.ts),
 * it calls `notifyClubAiUpdate` so the sentient UI (SmartPanel, ActivityPulse)
 * can refresh without polling. Delivery uses a service-role realtime
 * BROADCAST channel — clients receive broadcast events, never raw table
 * rows, so the ai_signals RLS policy (service-role only, no client read
 * policy) stays intact.
 *
 * `clubAiChannel` is a pure helper and is safe to import from client
 * components. `notifyClubAiUpdate` is server-side only and fail-safe: it
 * never throws (a failed notification only delays live updates — clients
 * also poll every 60s).
 */
import { createClient } from '@supabase/supabase-js';

/** Broadcast channel clients subscribe to for live sentient-UI updates. */
export function clubAiChannel(clubId: string): string {
    return `club-ai:${clubId}`;
}

/**
 * Notify listening clients that new club-level signals exist. Server-side
 * only. Never throws.
 */
export async function notifyClubAiUpdate(clubId: string): Promise<void> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return;
    try {
        const supabase = createClient(url, serviceKey);
        const channel = supabase.channel(clubAiChannel(clubId));
        await channel.send({
            type: 'broadcast',
            event: 'signals-changed',
            payload: { clubId },
        });
        await supabase.removeChannel(channel);
    } catch (err) {
        // Best-effort: clients poll as a fallback, so a failed broadcast
        // only delays (never breaks) live updates.
        console.warn('[sentient-realtime] broadcast failed (non-fatal):', err);
    }
}
