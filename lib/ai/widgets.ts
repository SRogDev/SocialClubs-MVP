/**
 * Typed widget runtime — server-side entry point (master plan Phases 53-57).
 *
 * Re-exports the client-safe registry from ./widget-configs and adds
 * createWidgetPost, which validates the config and creates the post
 * through postService (zod post schema + moderation queue + gamification).
 *
 * Governance note: this module does NOT call verifyAndExecute — that
 * helper does not exist on this base yet (it ships with the AI-staff
 * verification pipeline in a later phase). AI staff agents reach
 * createWidgetPost through their workflow steps, which run under the
 * workflow verification layer.
 */

import type { CreatePostInput } from '@/schemas/postSchema';
import { createPost } from '@/services/postService';
import type { Post } from '@/types/post';

import {
    validateWidgetConfig,
    WIDGET_TYPES,
    WIDGET_TYPE_NAMES,
    WIDGET_TYPE_TUPLE,
    type WidgetTypeEntry,
    type WidgetTypeName,
    type WidgetPostContent,
} from './widget-configs';

export {
    validateWidgetConfig,
    WIDGET_TYPES,
    WIDGET_TYPE_NAMES,
    WIDGET_TYPE_TUPLE,
    type WidgetTypeEntry,
    type WidgetTypeName,
    type WidgetPostContent,
};
export {
    pollWidgetConfigSchema,
    countdownWidgetConfigSchema,
    leaderboardWidgetConfigSchema,
    faqWidgetConfigSchema,
    rsvpWidgetConfigSchema,
    type PollWidgetConfig,
    type CountdownWidgetConfig,
    type LeaderboardWidgetConfig,
    type FaqWidgetConfig,
    type RsvpWidgetConfig,
} from './widget-configs';

export interface CreateWidgetPostDeps {
    /** Injected for tests. Defaults to the real postService.createPost. */
    createPostFn?: (input: CreatePostInput, userId: string) => Promise<Post>;
}

/**
 * Validate the config, then create a `type: 'widget'` post carrying
 * `content: { widget, config }`. The post flows through the normal
 * creation path (zod post schema, moderation queue, gamification).
 */
export async function createWidgetPost(
    clubId: string,
    widgetType: string,
    config: unknown,
    userId: string,
    deps: CreateWidgetPostDeps = {},
): Promise<Post> {
    const validated = validateWidgetConfig(widgetType, config);
    const create = deps.createPostFn ?? createPost;
    const content: Record<string, unknown> = {
        widget: widgetType,
        config: validated,
    };
    return create({ club_id: clubId, content, type: 'widget', pinned: false }, userId);
}
