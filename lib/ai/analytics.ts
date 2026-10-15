/**
 * AI analytics for the AI staff (master plan Phases 77-80).
 *
 * Read-side analytics over `ai_actions` / `ai_action_reviews` / `ai_usage` /
 * `ai_signals`:
 * - `getStaffHealth(clubId)` — per-agent status (enabled, last run, success
 *   rate, avg latency, error rate).
 * - `getActionStats(clubId, days)` — actions by type, by status, the
 *   proposed -> approved -> executed funnel, and the human approval rate.
 * - `getEngagementImpact(clubId, days)` — correlations between AI actions
 *   and member activity. Simple Pearson correlations over weekly buckets,
 *   honestly labeled as correlations (never causation).
 * - `buildBriefing(input)` — pure, deterministic daily-briefing text (no
 *   LLM) for the cron route.
 *
 * All read functions take an injected `AnalyticsDb` so unit tests run
 * without a database. `supabaseAnalyticsDb()` is the real adapter.
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { AGENTS } from './agents';
import { AIAgentError } from './types';

// ---------------------------------------------------------------------------
// Rows & db surface
// ---------------------------------------------------------------------------

/** One `ai_actions` row, projected to what analytics needs. */
export interface ActionRow {
    id: string;
    club_id: string;
    agent_id: string;
    action: string;
    status: string;
    created_at: string;
}

/** One `ai_action_reviews` row, projected to what analytics needs. */
export interface ReviewRow {
    action_id: string;
    reviewer_type: string;
    decision: string;
    created_at: string;
}

/** One `ai_usage` row, projected to latency + cost per agent. */
export interface UsageSample {
    agent_id: string;
    latency_ms: number;
    cost_usd: number;
}

/** One `ai_signals` row, projected to type only. */
export interface SignalSample {
    type: string;
    created_at: string;
}

/** One pending `ai_drafts` row. */
export interface PendingDraftSample {
    id: string;
}

/** Minimal storage surface the analytics layer needs (injected for tests). */
export interface AnalyticsDb {
    listActions(clubId: string, sinceIso: string): Promise<ActionRow[]>;
    listReviews(actionIds: string[]): Promise<ReviewRow[]>;
    listUsageSamples(clubId: string, sinceIso: string): Promise<UsageSample[]>;
    listSignalSamples(clubId: string, sinceIso: string): Promise<SignalSample[]>;
    listPendingDrafts(clubId: string): Promise<PendingDraftSample[]>;
    getEnabledAgents(clubId: string): Promise<string[]>;
}

export interface AnalyticsDeps {
    db: AnalyticsDb;
    now?: () => Date;
}

// ---------------------------------------------------------------------------
// Staff health
// ---------------------------------------------------------------------------

export type AgentHealthStatus = 'healthy' | 'degraded' | 'idle' | 'disabled';

/** Terminal statuses for one action row. */
const FINISHED_STATUSES = ['executed', 'failed', 'blocked'] as const;
/** Error-rate fraction above which an agent is reported as degraded. */
const DEGRADED_ERROR_RATE = 0.2;

export interface TrustExplanation {
    /** Plain Spanish: what the agent does, in one sentence. */
    what: string;
    /** Plain Spanish: what it cannot do / where it is limited. */
    limits: string;
}

/** Plain-Spanish "trust explanations" per staff agent. */
export const TRUST_EXPLANATIONS: Record<string, TrustExplanation> = {
    'community-manager': {
        what: 'Da la bienvenida a miembros nuevos, responde preguntas frecuentes y mantiene el club activo con resúmenes, recordatorios y avisos.',
        limits:
            'En el nivel 1 (Asesor) solo prepara borradores para tu revisión: nunca ejecuta nada por su cuenta. Sus respuestas se basan en el contenido del club, no en conocimiento externo verificado.',
    },
    'experience-director': {
        what: 'Detecta oportunidades de actividades y eventos a partir de las señales del club y las propone como ideas concretas.',
        limits:
            'Propone, no ejecuta: no tiene herramientas de acción en esta versión. Sus propuestas son sugerencias basadas en patrones, no garantías de que un evento funcionará.',
    },
    'creator-copilot': {
        what: 'Prepara resúmenes y recomendaciones para ti como creador: qué pasó en el club y qué merece tu atención.',
        limits:
            'Es de solo lectura más notificaciones: no puede publicar ni cambiar nada del club. Resume los datos disponibles; si el club tiene pocos datos, sus resúmenes son cortos.',
    },
    moderation: {
        what: 'Revisa contenido reportado o sospechoso y sugiere acciones de moderación para mantener el club seguro.',
        limits:
            'No sanciona ni elimina contenido por su cuenta sin aprobación humana: la decisión final siempre es tuya.',
    },
    'sentient-ui': {
        what: 'Genera recomendaciones de interfaz (SmartPanel) a partir de la actividad reciente del club.',
        limits:
            'Son sugerencias basadas en reglas y datos agregados, no personalización profunda: no conoce los gustos de cada miembro.',
    },
    reviewer: {
        what: 'Revisa automáticamente las acciones propuestas por otros agentes antes de que lleguen a tu bandeja.',
        limits:
            'Es un filtro de seguridad, no un experto en tu comunidad: puede pedir revisiones de más o dejar pasar errores sutiles.',
    },
};

const GENERIC_TRUST: TrustExplanation = {
    what: 'Un agente del staff de IA del club que propone o ejecuta acciones según su misión.',
    limits: 'Sus acciones quedan registradas para tu revisión y están sujetas a las políticas de gobernanza del club.',
};

/** Spanish display label per known staff agent. */
const AGENT_ES_LABELS: Record<string, string> = {
    'community-manager': 'Community Manager',
    'experience-director': 'Director de Experiencia',
    'creator-copilot': 'Copiloto del Creador',
    moderation: 'Moderación IA',
    'sentient-ui': 'Interfaz Sentiente',
    reviewer: 'Revisor IA',
};

export interface AgentHealth {
    agentId: string;
    label: string;
    enabled: boolean;
    status: AgentHealthStatus;
    /** ISO timestamp of the newest action row, or null when none. */
    lastRunAt: string | null;
    actionsTotal: number;
    /** executed / (executed + failed + blocked); null when no finished actions. */
    successRate: number | null;
    /** failed / total actions. */
    errorRate: number;
    /** Mean ai_usage latency_ms for this agent; null when no samples. */
    avgLatencyMs: number | null;
    trustExplanation: TrustExplanation;
}

function round6(n: number): number {
    return Math.round(n * 1e6) / 1e6;
}

/**
 * Per-agent health for one club: enabled flag, last run, success rate, avg
 * latency, error rate. Covers the three staff agents from AGENTS plus any
 * other agent ids seen in `ai_actions` (so new agents appear automatically).
 */
export async function getStaffHealth(
    clubId: string,
    deps: AnalyticsDeps,
): Promise<AgentHealth[]> {
    const now = deps.now ? deps.now() : new Date();
    const sinceIso = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString();

    const [enabledAgents, actions, usage] = await Promise.all([
        deps.db.getEnabledAgents(clubId),
        deps.db.listActions(clubId, sinceIso),
        deps.db.listUsageSamples(clubId, sinceIso),
    ]);
    const enabledSet = new Set(enabledAgents);

    const actionsByAgent = new Map<string, ActionRow[]>();
    for (const a of actions) {
        const list = actionsByAgent.get(a.agent_id) ?? [];
        list.push(a);
        actionsByAgent.set(a.agent_id, list);
    }
    const latByAgent = new Map<string, number[]>();
    for (const u of usage) {
        const list = latByAgent.get(u.agent_id) ?? [];
        list.push(u.latency_ms);
        latByAgent.set(u.agent_id, list);
    }

    const agentIds = new Set<string>([...Object.keys(AGENTS), ...actionsByAgent.keys()]);

    const health: AgentHealth[] = [];
    for (const agentId of agentIds) {
        const rows = actionsByAgent.get(agentId) ?? [];
        const enabled = enabledSet.has(agentId);
        const latencies = latByAgent.get(agentId) ?? [];

        const lastRunAt =
            rows.length > 0
                ? rows.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at
                : null;
        const finished = rows.filter((r) =>
            (FINISHED_STATUSES as readonly string[]).includes(r.status),
        );
        const executed = finished.filter((r) => r.status === 'executed').length;
        const failed = rows.filter((r) => r.status === 'failed').length;
        const successRate = finished.length > 0 ? round6(executed / finished.length) : null;
        const errorRate = rows.length > 0 ? round6(failed / rows.length) : 0;
        const avgLatencyMs =
            latencies.length > 0
                ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
                : null;

        const status: AgentHealthStatus = !enabled
            ? 'disabled'
            : rows.length === 0
              ? 'idle'
              : errorRate > DEGRADED_ERROR_RATE ||
                  (successRate !== null && successRate < 0.5)
                ? 'degraded'
                : 'healthy';

        health.push({
            agentId,
            label: AGENT_ES_LABELS[agentId] ?? AGENTS[agentId]?.role ?? agentId,
            enabled,
            status,
            lastRunAt,
            actionsTotal: rows.length,
            successRate,
            errorRate,
            avgLatencyMs,
            trustExplanation: TRUST_EXPLANATIONS[agentId] ?? GENERIC_TRUST,
        });
    }
    return health;
}

// ---------------------------------------------------------------------------
// Action stats & funnel
// ---------------------------------------------------------------------------

/** Statuses that still await a human decision (matches inbox.ts). */
const PENDING_STATUSES = ['draft', 'reviewing', 'running', 'pending_approval'] as const;

export interface ActionFunnel {
    proposed: number;
    /** Distinct actions with a human review decision 'approved'. */
    approved: number;
    executed: number;
    /** Still undecided (draft/reviewing/running/pending_approval). */
    pending: number;
}

export interface ActionTypeCount {
    type: string;
    count: number;
}

export interface ActionStats {
    clubId: string;
    days: number;
    total: number;
    /** Sorted by count, descending. */
    byType: ActionTypeCount[];
    byStatus: Record<string, number>;
    funnel: ActionFunnel;
    approvedCount: number;
    rejectedCount: number;
    /** approved / (approved + rejected); null when no human decisions. */
    approvalRate: number | null;
}

/**
 * Action volume by type and by status, the proposed -> approved -> executed
 * funnel, and the human approval rate. Approval decisions come from
 * `ai_action_reviews` with reviewer_type='human'.
 */
export async function getActionStats(
    clubId: string,
    days: number,
    deps: AnalyticsDeps,
): Promise<ActionStats> {
    const now = deps.now ? deps.now() : new Date();
    const sinceIso = new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();

    const actions = await deps.db.listActions(clubId, sinceIso);
    const reviews =
        actions.length > 0 ? await deps.db.listReviews(actions.map((a) => a.id)) : [];

    const byType = new Map<string, number>();
    const byStatus: Record<string, number> = {};
    for (const a of actions) {
        byType.set(a.action, (byType.get(a.action) ?? 0) + 1);
        byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }

    const humanDecisions = reviews.filter((r) => r.reviewer_type === 'human');
    const approvedIds = new Set(
        humanDecisions.filter((r) => r.decision === 'approved').map((r) => r.action_id),
    );
    const rejectedIds = new Set(
        humanDecisions.filter((r) => r.decision === 'rejected').map((r) => r.action_id),
    );
    const decided = approvedIds.size + rejectedIds.size;

    const funnel: ActionFunnel = {
        proposed: actions.length,
        approved: approvedIds.size,
        executed: actions.filter((a) => a.status === 'executed').length,
        pending: actions.filter((a) =>
            (PENDING_STATUSES as readonly string[]).includes(a.status),
        ).length,
    };

    return {
        clubId,
        days,
        total: actions.length,
        byType: [...byType.entries()]
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count),
        byStatus,
        funnel,
        approvedCount: approvedIds.size,
        rejectedCount: rejectedIds.size,
        approvalRate: decided > 0 ? round6(approvedIds.size / decided) : null,
    };
}

// ---------------------------------------------------------------------------
// Engagement impact (correlations, honestly labeled)
// ---------------------------------------------------------------------------

const BUCKET_DAYS = 7;

/**
 * Pearson correlation coefficient for paired samples. Returns null when
 * there are fewer than 2 samples or either series has no variance — a null
 * means "no measurable correlation", not zero correlation.
 */
export function pearson(xs: number[], ys: number[]): number | null {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return null;
    const x = xs.slice(0, n);
    const y = ys.slice(0, n);
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < n; i++) {
        num += (x[i] - mx) * (y[i] - my);
        dx += (x[i] - mx) ** 2;
        dy += (y[i] - my) ** 2;
    }
    if (dx === 0 || dy === 0) return null;
    return round6(num / Math.sqrt(dx * dy));
}

export interface CorrelationResult {
    name: string;
    description: string;
    /** Pearson r in [-1, 1]; null when the data cannot support a correlation. */
    coefficient: number | null;
    /** Number of weekly buckets behind the coefficient. */
    sampleBuckets: number;
    /** Always 'correlacion' — never present this as causation. */
    kind: 'correlacion';
    caveat: string;
}

export interface EngagementImpact {
    clubId: string;
    days: number;
    correlations: CorrelationResult[];
}

const CORRELATION_CAVEAT =
    'Esto es una correlación, no una causa: los eventos externos, el crecimiento orgánico y la estacionalidad también influyen. Úsala para explorar, no para decidir presupuestos.';

/**
 * Correlates AI action activity with member activity over weekly buckets:
 * (1) executed onboarding actions vs new posts, (2) all executed actions vs
 * new members. Every result is explicitly labeled as a correlation.
 */
export async function getEngagementImpact(
    clubId: string,
    days: number,
    deps: AnalyticsDeps,
): Promise<EngagementImpact> {
    const now = deps.now ? deps.now() : new Date();
    const sinceIso = new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();

    const [actions, signals] = await Promise.all([
        deps.db.listActions(clubId, sinceIso),
        deps.db.listSignalSamples(clubId, sinceIso),
    ]);

    const bucketCount = Math.max(1, Math.floor(days / BUCKET_DAYS));
    const onboarding = new Array<number>(bucketCount).fill(0);
    const executed = new Array<number>(bucketCount).fill(0);
    const posts = new Array<number>(bucketCount).fill(0);
    const joins = new Array<number>(bucketCount).fill(0);

    const bucketOf = (iso: string): number | null => {
        const t = new Date(iso).getTime();
        if (Number.isNaN(t)) return null;
        const ageDays = (now.getTime() - t) / (24 * 3600 * 1000);
        if (ageDays < 0 || ageDays > days) return null;
        // Bucket 0 = oldest, bucket N-1 = newest.
        const b = bucketCount - 1 - Math.floor(ageDays / BUCKET_DAYS);
        return Math.min(Math.max(b, 0), bucketCount - 1);
    };

    for (const a of actions) {
        const b = bucketOf(a.created_at);
        if (b === null || a.status !== 'executed') continue;
        executed[b] += 1;
        if (a.action === 'send_welcome') onboarding[b] += 1;
    }
    for (const s of signals) {
        const b = bucketOf(s.created_at);
        if (b === null) continue;
        if (s.type === 'new_post') posts[b] += 1;
        else if (s.type === 'member_joined') joins[b] += 1;
    }

    const hasData = (series: number[]) => series.some((v) => v > 0);
    /** Buckets that actually carry data (nonzero in either series). */
    const dataBuckets = (a: number[], b: number[]) =>
        a.filter((v, i) => v > 0 || b[i] > 0).length;

    const correlations: CorrelationResult[] = [
        {
            name: 'onboarding_posts',
            description:
                'Acciones de bienvenida ejecutadas (send_welcome) frente a publicaciones nuevas de miembros',
            coefficient: hasData(onboarding) && hasData(posts) ? pearson(onboarding, posts) : null,
            sampleBuckets: dataBuckets(onboarding, posts),
            kind: 'correlacion',
            caveat: CORRELATION_CAVEAT,
        },
        {
            name: 'executed_actions_members',
            description:
                'Todas las acciones ejecutadas frente a nuevos miembros que se unieron',
            coefficient: hasData(executed) && hasData(joins) ? pearson(executed, joins) : null,
            sampleBuckets: dataBuckets(executed, joins),
            kind: 'correlacion',
            caveat: CORRELATION_CAVEAT,
        },
    ];

    return { clubId, days, correlations };
}

// ---------------------------------------------------------------------------
// Combined payload + briefing
// ---------------------------------------------------------------------------

export interface ClubAnalytics {
    clubId: string;
    days: number;
    health: AgentHealth[];
    stats: ActionStats;
    engagement: EngagementImpact;
    generatedAt: string;
}

/** Combined payload for the API route and the panel page. */
export async function getClubAnalytics(
    clubId: string,
    days: number,
    deps: AnalyticsDeps,
): Promise<ClubAnalytics> {
    const [health, stats, engagement] = await Promise.all([
        getStaffHealth(clubId, deps),
        getActionStats(clubId, days, deps),
        getEngagementImpact(clubId, days, deps),
    ]);
    return {
        clubId,
        days,
        health,
        stats,
        engagement,
        generatedAt: (deps.now ? deps.now() : new Date()).toISOString(),
    };
}

export interface BriefingInput {
    clubName: string;
    /** Human date label, e.g. "14 de octubre de 2026". */
    dateLabel: string;
    pendingDrafts: number;
    actionsYesterday: number;
    executedYesterday: number;
    spendYesterdayUsd: number;
    currencyNote: string;
}

function pluralize(n: number, singular: string, plural: string): string {
    return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/**
 * Pure, deterministic daily-briefing text (no LLM). Plain Spanish, only
 * counts — it never invents recommendations or claims certainty.
 */
export function buildBriefing(input: BriefingInput): string {
    const lines = [
        `🤖 Resumen automático de tu staff de IA — ${input.clubName} (${input.dateLabel})`,
        '',
        `• ${pluralize(input.pendingDrafts, 'borrador pendiente', 'borradores pendientes')} de revisión en la Bandeja IA.`,
        `• Ayer el staff propuso ${pluralize(input.actionsYesterday, 'acción', 'acciones')}, de las cuales ${pluralize(input.executedYesterday, 'fue ejecutada', 'ejecutadas')}.`,
        `• Gasto de IA de ayer: $${input.spendYesterdayUsd.toFixed(4)}. ${input.currencyNote}`,
        '',
        'Revisa los borradores pendientes antes de que pierdan vigencia.',
    ];
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Real Supabase adapter
// ---------------------------------------------------------------------------

const ACTION_LIMIT = 5000;
const REVIEW_CHUNK = 200;

/**
 * Real AnalyticsDb backed by Supabase (service-role). Throws
 * AI_DB_UNAVAILABLE when the env vars are missing. Server-side only.
 */
export function supabaseAnalyticsDb(): AnalyticsDb {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured.',
        );
    }
    const supabase = createClient(url, serviceKey);

    return {
        async listActions(clubId: string, sinceIso: string): Promise<ActionRow[]> {
            const { data, error } = await supabase
                .from('ai_actions')
                .select('id, club_id, agent_id, action, status, created_at')
                .eq('club_id', clubId)
                .gte('created_at', sinceIso)
                .order('created_at', { ascending: true })
                .limit(ACTION_LIMIT);
            if (error) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read ai_actions: ${error.message}`);
            }
            return (data ?? []) as ActionRow[];
        },

        async listReviews(actionIds: string[]): Promise<ReviewRow[]> {
            const out: ReviewRow[] = [];
            for (let i = 0; i < actionIds.length; i += REVIEW_CHUNK) {
                const chunk = actionIds.slice(i, i + REVIEW_CHUNK);
                const { data, error } = await supabase
                    .from('ai_action_reviews')
                    .select('action_id, reviewer_type, decision, created_at')
                    .in('action_id', chunk);
                if (error) {
                    throw new AIAgentError(
                        'AI_DB_UNAVAILABLE',
                        `Failed to read ai_action_reviews: ${error.message}`,
                    );
                }
                out.push(...((data ?? []) as ReviewRow[]));
            }
            return out;
        },

        async listUsageSamples(clubId: string, sinceIso: string): Promise<UsageSample[]> {
            const { data, error } = await supabase
                .from('ai_usage')
                .select('agent_id, latency_ms, cost_usd')
                .eq('club_id', clubId)
                .gte('created_at', sinceIso)
                .limit(ACTION_LIMIT);
            if (error) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read ai_usage: ${error.message}`);
            }
            return ((data ?? []) as { agent_id: string; latency_ms: number; cost_usd: number }[]).map(
                (r) => ({ agent_id: r.agent_id, latency_ms: r.latency_ms, cost_usd: r.cost_usd }),
            );
        },

        async listSignalSamples(clubId: string, sinceIso: string): Promise<SignalSample[]> {
            const { data, error } = await supabase
                .from('ai_signals')
                .select('type, created_at')
                .eq('club_id', clubId)
                .gte('created_at', sinceIso)
                .limit(ACTION_LIMIT);
            if (error) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read ai_signals: ${error.message}`);
            }
            return (data ?? []) as SignalSample[];
        },

        async listPendingDrafts(clubId: string): Promise<PendingDraftSample[]> {
            const { data, error } = await supabase
                .from('ai_drafts')
                .select('id')
                .eq('club_id', clubId)
                .eq('status', 'pending_approval')
                .limit(500);
            if (error) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read ai_drafts: ${error.message}`);
            }
            return ((data ?? []) as { id: string }[]).map((d) => ({ id: d.id }));
        },

        async getEnabledAgents(clubId: string): Promise<string[]> {
            const { data, error } = await supabase
                .from('club_ai_config')
                .select('enabled_agents')
                .eq('club_id', clubId)
                .maybeSingle();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read club_ai_config: ${error.message}`,
                );
            }
            const agents = (data as { enabled_agents?: unknown } | null)?.enabled_agents;
            return Array.isArray(agents) ? (agents as string[]) : [];
        },
    };
}
