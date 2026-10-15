/**
 * API: AI Inbox list.
 *
 * GET /api/ai/inbox?clubId=<uuid>&status=<csv>&humanDecision=<approved|rejected>&countOnly=1
 *
 * Reads the audit trail (`ai_actions` + `ai_action_reviews`, ADR-002 §5) —
 * no separate store. Visible to club owner/admin/moderator.
 * `countOnly=1` returns just the pending count for the sidebar badge.
 * Gated by the AI_INBOX env flag (default OFF).
 */
import { NextResponse, type NextRequest } from 'next/server';

import { AI_INBOX, isEnabled } from '@/lib/ai/flags';
import {
    countPendingActions,
    listInboxActions,
    PENDING_STATUSES,
    supabaseInboxDb,
} from '@/lib/ai/inbox';
import { AIAgentError } from '@/lib/ai/types';
import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

const VALID_HUMAN_DECISIONS = ['approved', 'rejected'] as const;
type HumanDecision = (typeof VALID_HUMAN_DECISIONS)[number];

export async function GET(request: NextRequest) {
    if (!isEnabled(AI_INBOX)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    try {
        const limited = await rateLimit(request, RATE_LIMITS.QUERY);
        if (limited) return limited;

        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const clubId = searchParams.get('clubId');
        if (!clubId) {
            return NextResponse.json(
                { error: 'clubId es requerido' },
                { status: 400 },
            );
        }

        await requireClubRole(user.id, clubId, ['owner', 'admin', 'moderator']);

        const db = supabaseInboxDb();

        if (searchParams.get('countOnly') === '1') {
            const count = await countPendingActions(clubId, { db });
            return NextResponse.json({ data: { count } });
        }

        const statusParam = searchParams.get('status');
        const statuses = statusParam
            ? statusParam
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : [...PENDING_STATUSES];
        const humanDecisionParam = searchParams.get('humanDecision');
        const humanDecision = (
            VALID_HUMAN_DECISIONS as readonly string[]
        ).includes(humanDecisionParam ?? '')
            ? (humanDecisionParam as HumanDecision)
            : undefined;

        const actions = await listInboxActions(
            clubId,
            { db },
            { statuses, humanDecision },
        );
        return NextResponse.json({ data: { actions } });
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return NextResponse.json({ error: error.code }, { status: 403 });
        }
        if (
            error instanceof AIAgentError &&
            error.code === 'AI_DB_UNAVAILABLE'
        ) {
            return NextResponse.json({ error: error.code }, { status: 503 });
        }
        console.error('Error in GET /api/ai/inbox:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
