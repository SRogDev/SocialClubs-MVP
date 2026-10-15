/**
 * Client-safe display helpers for the AI Inbox (Spanish-first UI).
 *
 * Pure functions and constants only — NO server imports — so client
 * components can import this module directly. The server-side inbox
 * helpers live in `inbox.ts`.
 */
import { AGENTS } from './agents';

/** Human-readable agent name, e.g. "community-manager" -> "Community Manager". */
export function agentDisplayName(agentId: string): string {
    return AGENTS[agentId]?.role ?? agentId;
}

/** Two-letter avatar initials for an agent, e.g. "Community Manager" -> "CM". */
export function agentInitials(agentId: string): string {
    const words = agentDisplayName(agentId).split(/[\s-]+/).filter(Boolean);
    if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return agentDisplayName(agentId).slice(0, 2).toUpperCase();
}

/** Spanish labels for the v1 action registry (mirrors `actions.ts` names). */
export const ACTION_LABELS_ES: Record<string, string> = {
    send_message: 'Enviar mensaje',
    create_post: 'Crear publicación',
    comment_post: 'Comentar publicación',
    tag_post: 'Etiquetar publicación',
    hide_post: 'Ocultar publicación',
    notify_creator: 'Notificar al creador',
    create_event: 'Crear evento',
    grant_temporary_access: 'Otorgar acceso temporal',
    escalate_to_human: 'Escalar a humano',
    pause_agent: 'Pausar agente',
};

export function actionLabelEs(action: string): string {
    return ACTION_LABELS_ES[action] ?? action;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * v1 risk assignments, mirroring `ACTION_REGISTRY` in `actions.ts`.
 * Kept as data (not an import) so this module stays client-safe;
 * `inbox.test.ts` asserts the two stay in sync.
 */
export const ACTION_RISK: Record<string, RiskLevel> = {
    send_message: 'medium',
    create_post: 'medium',
    comment_post: 'medium',
    tag_post: 'low',
    hide_post: 'medium',
    notify_creator: 'low',
    create_event: 'medium',
    grant_temporary_access: 'high',
    escalate_to_human: 'low',
    pause_agent: 'high',
    // Community automation workflows (master plan Phases 41-45)
    send_welcome: 'low',
    send_checkin: 'low',
    post_digest: 'low',
    notify_inactive: 'medium',
    grant_points: 'medium',
    enroll_challenge: 'medium',
};

export const RISK_LABELS_ES: Record<RiskLevel, string> = {
    low: 'Riesgo bajo',
    medium: 'Riesgo medio',
    high: 'Riesgo alto',
    critical: 'Riesgo crítico',
};

/** Badge colors per risk level (Tailwind; repo palette). */
export const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
    low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export function riskOf(action: string): RiskLevel | null {
    return ACTION_RISK[action] ?? null;
}

/**
 * Short Spanish preview of an action's inputs for the inbox cards.
 * Falls back to truncated JSON for unknown actions.
 */
export function previewActionInputs(action: string, inputs: unknown): string {
    const i = (inputs ?? {}) as Record<string, unknown>;
    const str = (v: unknown): string =>
        typeof v === 'string' ? v : '';
    const clip = (s: string, max = 280): string =>
        s.length > max ? `${s.slice(0, max)}…` : s;

    switch (action) {
        case 'send_message':
            return clip(str(i.body));
        case 'create_post':
        case 'notify_creator': {
            const head = str(i.title);
            const body = str(i.body);
            return clip(head && body ? `${head} — ${body}` : head || body);
        }
        case 'comment_post':
            return clip(str(i.body));
        case 'tag_post':
            return str(i.tag) ? `Etiqueta: ${str(i.tag)}` : '';
        case 'hide_post':
            return clip(`Motivo: ${str(i.reason)}`);
        case 'create_event':
            return clip(str(i.title));
        case 'grant_temporary_access':
            return `Recurso: ${str(i.resource)} → ${str(i.memberId)}`;
        case 'escalate_to_human':
        case 'pause_agent':
            return clip(str(i.reason));
        default: {
            try {
                return clip(JSON.stringify(inputs) ?? '');
            } catch {
                return '';
            }
        }
    }
}

/**
 * One-line Spanish summary of a stored policy_result snapshot
 * (defensive: the column is free-form JSON).
 */
export function policySummaryEs(policyResult: unknown): string | null {
    if (!policyResult || typeof policyResult !== 'object') return null;
    const p = policyResult as Record<string, unknown>;
    const reason = typeof p.reason === 'string' && p.reason ? p.reason : null;
    const mode = typeof p.mode === 'string' && p.mode ? p.mode : null;
    if (reason && mode) return `${mode}: ${reason}`;
    return reason ?? (mode ? `Modo: ${mode}` : null);
}

/** Spanish label for an inbox status. */
export function statusLabelEs(status: string): string {
    switch (status) {
        case 'pending_approval':
            return 'Pendiente de aprobación';
        case 'draft':
            return 'Borrador';
        case 'approved':
            return 'Aprobada';
        case 'rejected':
            return 'Rechazada';
        case 'executed':
            return 'Ejecutada';
        case 'failed':
            return 'Fallida';
        case 'blocked':
            return 'Bloqueada';
        default:
            return status;
    }
}

/** Spanish label for a review decision. */
export function reviewDecisionLabelEs(decision: string): string {
    switch (decision) {
        case 'approved':
            return 'Aprobada';
        case 'rejected':
            return 'Rechazada';
        case 'pass':
            return 'Aprobada por IA';
        case 'revise':
            return 'Revisión sugerida';
        case 'escalate':
            return 'Escalada a humano';
        case 'block':
            return 'Bloqueada por IA';
        default:
            return decision;
    }
}
