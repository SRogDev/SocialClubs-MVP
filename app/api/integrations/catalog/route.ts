/**
 * GET /api/integrations/catalog?clubId=<uuid>
 *
 * The creator-facing connection catalog: the STARTER surfacing set
 * (social + entertainment, Roger's rule) with this club's binding
 * status per app. The architecture accepts any toolkit — this route
 * only controls what is surfaced first. Staff (owner/admin) only.
 * Without a configured provider the surface reports configured:false
 * and the UI hides the feature (graceful absence).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { STARTER_TOOLKITS } from '@/lib/integrations/catalog';
import { resolveIntegrations } from '@/lib/integrations/server';
import { entityIdForUser } from '@/lib/integrations/types';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const querySchema = z.object({ clubId: z.string().uuid() });

export async function GET(request: NextRequest) {
    const limited = rateLimit(request, RATE_LIMITS.READ);
    if (limited) return limited;

    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const parsed = querySchema.safeParse({
        clubId: request.nextUrl.searchParams.get('clubId'),
    });
    if (!parsed.success) {
        return NextResponse.json({ error: 'clubId inválido' }, { status: 400 });
    }
    const { clubId } = parsed.data;

    try {
        await requireClubRole(user.id, clubId, ['owner', 'admin']);
    } catch (e) {
        if (e instanceof AuthorizationError) {
            return NextResponse.json({ error: 'No autorizado para este club' }, { status: 403 });
        }
        throw e;
    }

    const integrations = resolveIntegrations();
    if (!integrations) {
        return NextResponse.json({
            success: true,
            configured: false,
            apps: STARTER_TOOLKITS.map((t) => ({ ...t, connected: false, status: null })),
        });
    }

    const bindings = await integrations.connections.listBindings(clubId);
    const bindingByToolkit = new Map(bindings.map((b) => [b.toolkitSlug, b]));
    const live = await integrations.provider
        .listConnections(entityIdForUser(user.id))
        .catch(() => []);
    const liveById = new Map(live.map((c) => [c.id, c]));

    const apps = STARTER_TOOLKITS.map((t) => {
        const binding = bindingByToolkit.get(t.slug);
        const liveConn = binding ? liveById.get(binding.connectedAccountId) : undefined;
        return {
            ...t,
            connected: Boolean(binding && binding.status === 'active'),
            status: liveConn?.status ?? (binding ? 'active' : null),
        };
    });

    return NextResponse.json({ success: true, configured: true, apps });
}
