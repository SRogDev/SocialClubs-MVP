/**
 * Signal dispatch: persist an AI signal, then hand it to the QStash worker.
 *
 * This is the single entry point product code uses to emit AI signals
 * (see the emitters in services/postService.ts, services/clubService.ts,
 * services/gamificationService.ts). Contract:
 *
 * - Never throws for infrastructure reasons (missing DB env, missing QStash
 *   config, network failures): every failure is logged and swallowed, so a
 *   signal problem can never break the user-facing action that emitted it.
 * - Persists FIRST via emitSignal (deduped): a signal that cannot be
 *   delivered is still a durable row, never silently lost.
 * - Delivery is fire-and-forget: callers do NOT await this (they attach a
 *   `.catch` for the impossible). When QSTASH_TOKEN / NEXT_PUBLIC_SITE_URL
 *   are not configured, delivery is skipped with a log line (dev mode).
 *
 * Worker endpoint: POST /api/queues/ai-signals
 */
import {
    emitSignal,
    supabaseSignalDb,
    type EmitInput,
    type SignalDb,
} from './signals';

export interface DispatchDeps {
    /** Injected storage (tests). Defaults to the service-role Supabase adapter. */
    db?: SignalDb;
    now?: () => Date;
}

/**
 * Emit a signal and enqueue its worker delivery.
 *
 * @example
 * dispatchSignal({
 *   type: 'new_post',
 *   clubId: post.club_id,
 *   payload: { postId: post.id, authorId: userId },
 *   dedupKey: `new_post:${post.id}`,
 * }).catch((err) => console.error('[ai-signals] dispatch failed:', err));
 */
export async function dispatchSignal(input: EmitInput, deps?: DispatchDeps): Promise<void> {
    let signalId: string;
    try {
        const db = deps?.db ?? supabaseSignalDb();
        const { deduped, signal } = await emitSignal(input, { db, now: deps?.now });
        if (deduped) {
            console.log(`[ai-signals] deduped ${input.type} (key=${input.dedupKey})`);
            return;
        }
        signalId = signal.id;
    } catch (err) {
        // The user action already succeeded; a signal must never break it.
        console.error('[ai-signals] emitSignal failed:', err);
        return;
    }

    const token = process.env.QSTASH_TOKEN;
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (!token || !baseUrl) {
        console.log(
            '[ai-signals] QSTASH_TOKEN / NEXT_PUBLIC_SITE_URL not configured — ' +
                `signal ${signalId} persisted, delivery skipped (dev mode)`,
        );
        return;
    }

    try {
        // Dynamic import: the shared lib/qstash.ts throws at module load when
        // QSTASH_TOKEN is unset, which would break dev/test imports of this file.
        const { Client } = await import('@upstash/qstash');
        const client = new Client({ token });
        await client.publishJSON({
            url: `${baseUrl}/api/queues/ai-signals`,
            body: { signalId },
            retries: 3,
        });
    } catch (err) {
        console.error('[ai-signals] QStash publish failed:', err);
    }
}
