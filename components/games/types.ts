/**
 * Client-side shapes for the minigame surface (mirror of the API summary —
 * the raw HTML artifact is never part of these types).
 */
import type { GameBrief } from '@/lib/games/brief';
import type { GameStatus } from '@/lib/games/service';
import type { GameValidationReport } from '@/lib/games/validate';

export interface GameSummary {
    id: string;
    clubId: string;
    eventId: string | null;
    postId: string | null;
    createdBy: string;
    createdByAgent: string | null;
    title: string;
    prompt: string;
    status: GameStatus;
    brief: GameBrief;
    capabilities: string[];
    validation: GameValidationReport | null;
    mock: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LeaderboardEntry {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    score: number;
    achievedAt: string;
}

/** Spanish labels for the bridge capabilities (creator approval list). */
export const CAPABILITY_LABELS: Record<string, string> = {
    'member.profile': 'Perfil del miembro',
    'points.award': 'Puntos del club',
    leaderboard: 'Clasificación',
    'game.state': 'Estado del juego',
    'event.context': 'Contexto del evento',
    unlocks: 'Desbloqueos',
    outcomes: 'Resultados',
    'content.read': 'Contenido del club',
};

export const STATUS_LABELS: Record<GameStatus, string> = {
    draft: 'Borrador',
    published: 'Publicado',
    rejected: 'Rechazado',
    archived: 'Archivado',
};
