/**
 * AI widget suggestion (master plan Phases 53-57).
 *
 * DRAFTS ONLY: returns ONE widget { type, config, reason } for a creator
 * to review and publish manually. This never creates a post.
 *
 * The model's output passes through the same zod validation as stored
 * widgets (validateWidgetConfig) — an invalid draft is a hard
 * AI_OUTPUT_INVALID error, never silently fixed or published.
 */

import { z } from 'zod';

import { invokeAgent, type InvokeDeps, type InvokeTrace } from './runtime';
import { AIAgentError, type AgentDefinition } from './types';
import {
    WIDGET_TYPE_TUPLE,
    validateWidgetConfig,
    type WidgetTypeName,
} from './widget-configs';

export const widgetSuggestionSchema = z.object({
    type: z.enum(WIDGET_TYPE_TUPLE),
    config: z.record(z.string(), z.unknown()),
    reason: z.string().trim().min(1, 'El motivo no puede estar vacío').max(500),
});

export type WidgetSuggestion = z.infer<typeof widgetSuggestionSchema>;

const WIDGET_SUGGESTER: AgentDefinition = {
    id: 'widgets',
    role: 'Widget Suggester',
    mission:
        'Suggest ONE widget (type + config draft) that fits the club context. ' +
        'Drafts only — the creator reviews and publishes manually; you never publish.',
    contextSources: ['club_profile'],
    tools: [],
    permissions: [],
    triggers: [],
    policies: [
        'Pick exactly one of the registered widget types: poll, countdown, leaderboard, faq, rsvp.',
        'Never invent a new widget type and never emit code — typed configs only.',
        'Write all user-facing text in Spanish.',
        'Keep configs realistic and minimal: 3-4 poll options, 2-4 FAQ items, near-term dates.',
    ],
    outputSchema: widgetSuggestionSchema,
    tier: 'fast',
};

export interface SuggestWidgetDeps extends InvokeDeps {}

export interface SuggestWidgetResult extends WidgetSuggestion {
    trace: InvokeTrace;
}

/**
 * Ask the AI for a widget draft for a club. Throws AIAgentError when the
 * agent is disabled, the budget is exhausted, or the drafted config fails
 * zod validation against the widget registry.
 */
export async function suggestWidget(
    clubId: string,
    context: string,
    deps: SuggestWidgetDeps = {},
): Promise<SuggestWidgetResult> {
    const { output, trace } = await invokeAgent<WidgetSuggestion>(
        WIDGET_SUGGESTER,
        { type: 'widget_suggest', clubId, payload: { context } },
        deps,
    );

    let validatedType: WidgetTypeName;
    try {
        validatedType = output.type;
        validateWidgetConfig(output.type, output.config);
    } catch (err) {
        throw new AIAgentError(
            'AI_OUTPUT_INVALID',
            `Widget suggestion failed registry validation: ${
                err instanceof Error ? err.message : String(err)
            }`,
        );
    }

    return { type: validatedType, config: output.config, reason: output.reason, trace };
}
