/**
 * POST /api/ai/faq
 *
 * Community Manager v0 (master plan Phases 4-7): answer a club member's
 * question from the club's configured FAQ (`club_ai_config.policies.faq`).
 *
 * Body: { clubId: string, question: string }
 * Returns: { answer: string | null, grounded: boolean, confidence: number }
 *   - answer === null means the club has no FAQ configured
 *     (reason: 'no_faq_configured').
 *   - grounded === false means the model answered "No lo sé": the FAQ did
 *     not cover the question (anti-hallucination).
 *
 * Auth: the caller must be a member of the club. Rate-limited (20/min/IP —
 * each question costs one LLM call).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { answerFAQ } from '@/lib/ai/agents/community-manager';
import { supabaseVerifyDb } from '@/lib/ai/verify';
import { AIAgentError } from '@/lib/ai/types';
import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

// Node.js runtime — verify.ts uses node:crypto and the service-role client.
export const runtime = 'nodejs';

const bodySchema = z.object({
    clubId: z.string().min(1).max(100),
    question: z.string().trim().min(1).max(1000),
});

/** 20 questions/minute per IP: every question costs one LLM call. */
const FAQ_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
    const limited = await rateLimit(request, FAQ_RATE_LIMIT);
    if (limited) return limited;

    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Petición inválida: clubId y question son requeridos' },
                { status: 400 },
            );
        }
        const { clubId, question } = parsed.data;

        try {
            await requireClubRole(user.id, clubId, ['owner', 'admin', 'moderator', 'member']);
        } catch (err) {
            if (err instanceof AuthorizationError) {
                return NextResponse.json(
                    { error: 'Solo los miembros del club pueden hacer preguntas' },
                    { status: 403 },
                );
            }
            throw err;
        }

        const result = await answerFAQ(question, clubId, { db: supabaseVerifyDb() });
        return NextResponse.json({
            answer: result.answer,
            grounded: result.grounded,
            confidence: result.confidence,
            ...(result.reason ? { reason: result.reason } : {}),
        });
    } catch (err) {
        console.error('[AI FAQ] Failed:', err);
        if (err instanceof AIAgentError) {
            // Flag disabled, budget exceeded, DB unavailable, provider error —
            // honest 503, no internals leaked.
            return NextResponse.json(
                { error: 'La IA del club no está disponible ahora mismo' },
                { status: 503 },
            );
        }
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
