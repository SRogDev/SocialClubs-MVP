/**
 * Experience Director ↔ minigames (Workstream B).
 *
 * The club AI can AUTHOR games too (Roger's rule: creators + the club AI
 * create; members only play). The director proposes a game for an event
 * through the exact same pipeline a creator uses — prompt → brief →
 * code → validation → DRAFT. It never publishes: a human creator
 * approves the draft in the studio (the platform's L1 draft culture).
 *
 * Published games are also experience primitives: anything composing an
 * experience can select from the club library via
 * `service.listLibrary(clubId, 'published')` and attach with
 * `service.attachGame(gameId, { eventId })`.
 */
import { generateGame, type GenerateGameDeps } from './generate';
import type { GameRow, GameService } from './service';

export const EXPERIENCE_DIRECTOR_AGENT = 'experience-director';

export async function suggestGameForEvent(
    input: {
        clubId: string;
        eventId: string;
        eventTitle: string;
        eventDescription?: string;
        /** Human on whose behalf the suggestion is stored (club owner). */
        createdBy: string;
    },
    deps: { service: GameService; generate?: GenerateGameDeps },
): Promise<GameRow> {
    const prompt =
        `Crea un minijuego corto y divertido para el evento "${input.eventTitle}" de este club.` +
        (input.eventDescription ? ` Contexto del evento: ${input.eventDescription}` : '') +
        ' Debe jugarse en pocos minutos, ser asíncrono y terminar en una clasificación del evento.';
    const result = await generateGame(
        {
            clubId: input.clubId,
            prompt,
            createdBy: input.createdBy,
            createdByAgent: EXPERIENCE_DIRECTOR_AGENT,
            eventId: input.eventId,
        },
        deps.generate ?? {},
    );
    return deps.service.createDraft({
        clubId: input.clubId,
        prompt,
        brief: result.brief,
        html: result.html,
        validation: result.validation,
        mock: result.mock,
        createdBy: input.createdBy,
        createdByAgent: EXPERIENCE_DIRECTOR_AGENT,
        eventId: input.eventId,
    });
}
