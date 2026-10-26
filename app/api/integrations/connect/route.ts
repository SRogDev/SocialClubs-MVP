/**
 * POST /api/integrations/connect  { clubId, toolkitSlug }
 * DELETE /api/integrations/connect?clubId=&toolkit=
 *
 * Platform-managed OAuth (Roger's rule): the creator only clicks
 * through the provider's hosted consent. We mint a Connect Link for
 * the creator's entity, record the club binding, and return the
 * redirect URL. Tokens live at the provider — never here.
 * Disconnect removes the provider connection (best effort) and the
 * club binding (always), so the club loses access immediately.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { resolveIntegrations } from '@/lib/integrations/server';
import { entityIdForUser } from '@/lib/integrations/types';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const connectSchema = z.object({
    clubId: z.string().uuid(),
    // Any toolkit slug is acceptable at the API layer (the architecture
    // is catalog-open); the UI surfaces the starter set.
    toolkitSlug: z
        .string()
        .min(2)
        .max(60)
        .regex(/^[a-z0-9_]+$/),
});

async function requireStaff(clubId: string) {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
    try {
        await requireClubRole(user.id, clubId, ['owner', 'admin']);
    } catch (e) {
        if (e instanceof AuthorizationError) {
            return { error: NextResponse.json({ error: 'No autorizado para este club' }, { status: 403 }) };
        }
        throw e;
    }
    return { user };
}

export async function POST(request: NextRequest) {
    const limited = rateLimit(request, RATE_LIMITS.MUTATION);
    if (limited) return limited;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const { clubId, toolkitSlug } = parsed.data;

    const auth = await requireStaff(clubId);
    if ('error' in auth) return auth.error;
    const user = auth.user!;

    const integrations = resolveIntegrations();
    if (!integrations) {
        return NextResponse.json(
            { error: 'Las integraciones no están configuradas en esta instalación.' },
            { status: 404 },
        );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const callbackUrl = `${origin}/clubs/${clubId}/panel/ai-integrations?connected=${toolkitSlug}`;
    try {
        const link = await integrations.provider.createConnectLink({
            entityId: entityIdForUser(user.id),
            toolkitSlug,
            callbackUrl,
        });
        await integrations.connections.upsertBinding({
            clubId,
            creatorUserId: user.id,
            toolkitSlug,
            connectedAccountId: link.connectionId,
        });
        return NextResponse.json({ success: true, redirectUrl: link.redirectUrl });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'No se pudo iniciar la conexión.' },
            { status: 502 },
        );
    }
}

export async function DELETE(request: NextRequest) {
    const limited = rateLimit(request, RATE_LIMITS.MUTATION);
    if (limited) return limited;

    const clubId = request.nextUrl.searchParams.get('clubId');
    const toolkit = request.nextUrl.searchParams.get('toolkit');
    if (!clubId || !toolkit || !z.string().uuid().safeParse(clubId).success) {
        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const auth = await requireStaff(clubId);
    if ('error' in auth) return auth.error;

    const integrations = resolveIntegrations();
    if (!integrations) {
        return NextResponse.json({ error: 'Integraciones no configuradas.' }, { status: 404 });
    }

    const binding = await integrations.connections.getBinding(clubId, toolkit);
    if (binding) {
        await integrations.provider
            .deleteConnection(binding.connectedAccountId)
            .catch(() => undefined);
        await integrations.connections.removeBinding(clubId, toolkit);
    }
    return NextResponse.json({ success: true });
}
