/**
 * Shared metadata for the AI config page (no 'use server' — plain module).
 *
 * Imported by both page.tsx (rendering) and actions.ts (the server action
 * that reads the agent_* checkboxes from the form). Keep this file free of
 * 'use server' so the constants can be exported.
 */

/** Staff agents the creator can toggle per club. */
export const CONFIGURABLE_AGENTS = [
    'community-manager',
    'experience-director',
    'creator-copilot',
    'moderation',
] as const;

export type ConfigurableAgent = (typeof CONFIGURABLE_AGENTS)[number];

export const AGENT_LABELS: Record<ConfigurableAgent, { name: string; description: string }> = {
    'community-manager': {
        name: 'Community Manager',
        description: 'Bienvenidas, mensajes de reconexión y resúmenes semanales.',
    },
    'experience-director': {
        name: 'Director de Experiencia',
        description: 'Experiencias y momentos dentro del club.',
    },
    'creator-copilot': {
        name: 'Copiloto del creador',
        description: 'Ayuda a redactar y mejorar tus publicaciones.',
    },
    moderation: {
        name: 'Moderación IA',
        description: 'Detecta spam y contenido problemático.',
    },
};

export const LEVELS = [
    {
        level: 1,
        title: 'Nivel 1 — Asesor',
        tagline: 'La IA propone, tú decides.',
        description:
            'Todas las acciones de la IA quedan como borradores en la Bandeja IA. ' +
            'Nada se envía, nada se publica y nada se otorga sin tu aprobación. Sin excepciones.',
        capabilities: [
            'Borrador de bienvenida para cada miembro nuevo',
            'Borrador de reconexión para miembros inactivos',
            'Borrador del resumen semanal',
        ],
    },
    {
        level: 2,
        title: 'Nivel 2 — Operador',
        tagline: 'La IA actúa en lo de bajo riesgo.',
        description:
            'Las acciones de bajo riesgo (bienvenidas, resúmenes, avisos al creador) ' +
            'se ejecutan automáticamente. Las de riesgo medio o alto esperan tu aprobación ' +
            'en la Bandeja IA.',
        capabilities: [
            'Envía bienvenidas y reconexiones automáticamente',
            'Publica el resumen semanal automáticamente',
            'Pide tu aprobación para incentivos y avisos masivos',
        ],
    },
    {
        level: 3,
        title: 'Nivel 3 — Autónomo',
        tagline: 'La IA opera el club por ti.',
        description:
            'Las acciones de riesgo bajo y medio se ejecutan automáticamente ' +
            '(incluye incentivos por reconexión y avisos a inactivos). ' +
            'Lo de riesgo alto o crítico siempre requiere tu aprobación.',
        capabilities: [
            'Todo lo del Nivel 2',
            'Otorga puntos de incentivo automáticamente',
            'Notifica a miembros inactivos e inscribe en el reto de bienvenida',
        ],
    },
] as const;

export const TONES = [
    { value: 'friendly', label: 'Amable' },
    { value: 'formal', label: 'Formal' },
    { value: 'energetic', label: 'Enérgico' },
] as const;
