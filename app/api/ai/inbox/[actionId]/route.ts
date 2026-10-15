/**
 * API: AI Inbox human decision.
 *
 * POST /api/ai/inbox/[actionId]  { decision: 'approve' | 'reject', feedback? }
 *
 * - approve: records the human `approved` review, EXECUTES the action now
 *   through its registry executor, and marks it `executed`.
 * - reject: records the human `rejected` review (with optional feedback)
 *   and marks the row `rejected` — never executes.
 *
 * Only club owner/admin decide; moderators can view the inbox (GET) but
 * not decide. Decisions are idempotent: re-deciding a decided action is a
 * no-op. Gated by the AI_INBOX env flag (default OFF).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { AI_INBOX, isEnabled } from '@/lib/ai/flags';
import {
    approveAction,
    getInboxAction,
    InboxError,
    rejectAction,
    supabaseInboxDb,
} from '@/lib/ai/inbox';
import { AIAgentError } from '@/lib/ai/types';
import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

const DecisionBodySchema = z.object({
    decision: z.enum(['approve', 'reject']),
    feedback: z.string().max(2000).optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ actionId: string }> },
) {
    if (!isEnabled(AI_INBOX)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    try {
        const limited = await rateLimit(request, RATE_LIMITS.MUTATION);
        if (limited) return limited;

        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { actionId } = await params;
        if (!actionId) {
            return NextResponse.json(
                { error: 'actionId es requerido' },
                { status: 400 },
            );
        }

        const body: unknown = await request.json().catch(() => null);
        const parsed = DecisionBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'decision debe ser "approve" o "reject"' },
                { status: 400 },
            );
        }

        const db = supabaseInboxDb();
        const item = await getInboxAction(actionId, { db });
        if (!item) {
            return NextResponse.json(
                { error: 'Acción no encontrada' },
                { status: 404 },
            );
        }

        // Only owners and admins decide; moderators can view the inbox.
        await requireClubRole(user.id, item.clubId, ['owner', 'admin']);

        const { decision, feedback } = parsed.data;
        const result =
            decision === 'approve'
                ? await approveAction(actionId, user.id, { db }, feedback)
                : await rejectAction(actionId, user.id, { db }, feedback);
        return NextResponse.json({ data: result });
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return NextResponse.json({ error: error.code }, { status: 403 });
        }
        if (error instanceof InboxError) {
            return NextResponse.json({ error: error.code }, { status: 404 });
        }
        if (
            error instanceof AIAgentError &&
            error.code === 'AI_DB_UNAVAILABLE'
        ) {
            return NextResponse.json({ error: error.code }, { status: 503 });
        }
        console.error('Error in POST /api/ai/inbox/[actionId]:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
