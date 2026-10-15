/**
 * Typed widget runtime — config registry (master plan Phases 53-57).
 *
 * CLIENT-SAFE: this module imports only zod. It is bundled into client
 * components (the feed renderers). Server-only logic (post creation via
 * postService) lives in lib/ai/widgets.ts — never import that from a
 * client component.
 *
 * v1 RULE: widgets are TYPED CONFIGS ONLY. Exactly five widget types.
 * No codegen, no runtime registration. Every config is validated by zod
 * before it is stored or rendered; unknown types are rejected.
 */
import { z } from 'zod';


// ─── Config schemas (one per widget type) ───────────────────────────────────

export const pollWidgetConfigSchema = z.object({
    question: z.string().trim().min(3, 'La pregunta es muy corta').max(300),
    options: z
        .array(z.string().trim().min(1, 'La opción no puede estar vacía').max(100))
        .min(2, 'Mínimo 2 opciones')
        .max(10, 'Máximo 10 opciones'),
    closesAt: z.string().datetime({ message: 'Fecha de cierre inválida' }).optional(),
    allowMultiple: z.boolean().default(false),
});

export const countdownWidgetConfigSchema = z.object({
    title: z.string().trim().min(1, 'El título no puede estar vacío').max(120),
    targetAt: z.string().datetime({ message: 'Fecha objetivo inválida' }),
    description: z.string().trim().max(300).optional(),
});

export const leaderboardWidgetConfigSchema = z.object({
    title: z.string().trim().min(1).max(120).default('Clasificación'),
    limit: z.number().int().min(1, 'Mínimo 1').max(25, 'Máximo 25').default(10),
});

export const faqWidgetConfigSchema = z.object({
    title: z.string().trim().min(1).max(120).default('Preguntas frecuentes'),
    items: z
        .array(
            z.object({
                q: z.string().trim().min(1, 'La pregunta no puede estar vacía').max(200),
                a: z.string().trim().min(1, 'La respuesta no puede estar vacía').max(1000),
            }),
        )
        .min(1, 'Mínimo 1 pregunta')
        .max(20, 'Máximo 20 preguntas'),
});

export const rsvpWidgetConfigSchema = z.object({
    eventId: z.string().uuid('ID de evento inválido'),
    title: z.string().trim().min(1, 'El título no puede estar vacío').max(120),
    startsAt: z.string().datetime({ message: 'Fecha de inicio inválida' }),
    endsAt: z.string().datetime({ message: 'Fecha de fin inválida' }).optional(),
    timezone: z.string().min(1).max(60).default('UTC'),
    location: z.string().trim().max(200).optional(),
});

// ─── Registry ────────────────────────────────────────────────────────────────

export const WIDGET_TYPE_TUPLE = ['poll', 'countdown', 'leaderboard', 'faq', 'rsvp'] as const;
export type WidgetTypeName = (typeof WIDGET_TYPE_TUPLE)[number];
export const WIDGET_TYPE_NAMES: readonly WidgetTypeName[] = WIDGET_TYPE_TUPLE;

export interface WidgetTypeEntry {
    /** Zod schema every config for this type must satisfy. */
    configSchema: z.ZodType<unknown>;
    /** React component name in components/widgets/ (registry only — never eval'd). */
    renderer: string;
    /** Short Spanish description for pickers and AI prompts. */
    description: string;
}

export const WIDGET_TYPES: Record<WidgetTypeName, WidgetTypeEntry> = {
    poll: {
        configSchema: pollWidgetConfigSchema,
        renderer: 'PollWidget',
        description: 'Encuesta con opciones votables y barra de resultados.',
    },
    countdown: {
        configSchema: countdownWidgetConfigSchema,
        renderer: 'CountdownWidget',
        description: 'Cuenta regresiva en vivo hasta una fecha y hora.',
    },
    leaderboard: {
        configSchema: leaderboardWidgetConfigSchema,
        renderer: 'LeaderboardWidget',
        description: 'Clasificación de miembros por puntos de gamificación.',
    },
    faq: {
        configSchema: faqWidgetConfigSchema,
        renderer: 'FaqWidget',
        description: 'Acordeón de preguntas y respuestas.',
    },
    rsvp: {
        configSchema: rsvpWidgetConfigSchema,
        renderer: 'RsvpWidget',
        description: 'Tarjeta de evento con confirmación de asistencia.',
    },
};

// ─── Config types ────────────────────────────────────────────────────────────

export type PollWidgetConfig = z.infer<typeof pollWidgetConfigSchema>;
export type CountdownWidgetConfig = z.infer<typeof countdownWidgetConfigSchema>;
export type LeaderboardWidgetConfig = z.infer<typeof leaderboardWidgetConfigSchema>;
export type FaqWidgetConfig = z.infer<typeof faqWidgetConfigSchema>;
export type RsvpWidgetConfig = z.infer<typeof rsvpWidgetConfigSchema>;

/** The typed widget payload stored on a post's `content` column. */
export interface WidgetPostContent {
    widget: WidgetTypeName;
    config: Record<string, unknown>;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a widget config against the registry. Throws on unknown type
 * or schema violation — callers must treat the throw as the rejection.
 */
export function validateWidgetConfig(type: string, config: unknown): Record<string, unknown> {
    const entry = (WIDGET_TYPES as Record<string, WidgetTypeEntry | undefined>)[type];
    if (!entry) {
        throw new Error(
            `Unknown widget type "${type}". Registered types: ${WIDGET_TYPE_NAMES.join(', ')}.`,
        );
    }
    return entry.configSchema.parse(config) as Record<string, unknown>;
}

