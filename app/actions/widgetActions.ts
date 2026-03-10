'use server'

/**
 * Widget Actions — server actions for widget publishing and member interactions
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
    publishWidgetSchema,
    interactWithWidgetSchema,
    giveawayFormSchema,
    countdownFormSchema,
    questionBoxFormSchema,
    updateWidgetDataFieldSchema,
    type PublishWidgetInput,
    type InteractWithWidgetInput,
} from '@/schemas/widgetSchema'
import {
    publishWidget,
    getWidgetBySlug,
    getClubWidgetData,
    updateWidgetDataField,
    updateWidgetCacheData,
} from '@/services/widgetService'
import type { GiveawayParticipant, Question } from '@/types/widget'

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthUser() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
}

// ─── Publish ──────────────────────────────────────────────────────────────────

/**
 * Publish a new widget post in a club.
 * Validates per-slug form data, creates club_widget + data rows + post.
 */
export async function publishWidgetAction(
    input: PublishWidgetInput
): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
        const validated = publishWidgetSchema.parse(input)
        const user = await getAuthUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const supabase = await createClient()

        // Verify club membership
        const { data: membership } = await supabase
            .from('users_clubs')
            .select('id')
            .eq('user_id', user.id)
            .eq('club_id', validated.clubId)
            .single()

        if (!membership) return { success: false, error: 'Not a club member' }

        // Validate form data per widget slug
        let parsedForm: Record<string, string>
        let pinned = false

        switch (validated.widgetSlug) {
            case 'giveaway': {
                const r = giveawayFormSchema.safeParse(validated.formData)
                if (!r.success) return { success: false, error: r.error.issues[0]?.message }
                parsedForm = validated.formData
                break
            }
            case 'countdown': {
                const r = countdownFormSchema.safeParse(validated.formData)
                if (!r.success) return { success: false, error: r.error.issues[0]?.message }
                parsedForm = validated.formData
                pinned = true
                break
            }
            case 'question-box': {
                const r = questionBoxFormSchema.safeParse(validated.formData)
                if (!r.success) return { success: false, error: r.error.issues[0]?.message }
                parsedForm = validated.formData
                break
            }
        }

        // Resolve widget id from catalog
        const widget = await getWidgetBySlug(validated.widgetSlug)
        if (!widget) return { success: false, error: 'Widget type not found' }

        const { postId } = await publishWidget(
            validated.clubId,
            widget.id,
            validated.widgetSlug,
            parsedForm!,
            user.id,
            pinned
        )

        revalidatePath(`/clubs/${validated.clubId}`)
        return { success: true, postId }
    } catch (err) {
        console.error('[publishWidgetAction]', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── Interact ─────────────────────────────────────────────────────────────────

/**
 * Generic interaction entry point.
 * - join / leave  → giveaway participants array
 * - ask           → question-box questions array  (payload: { text: string })
 * - answer        → question-box answer           (payload: { questionId: string, answer: string })
 */
export async function interactWithWidgetAction(
    input: InteractWithWidgetInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const validated = interactWithWidgetSchema.parse(input)
        const user = await getAuthUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const resolved = await getClubWidgetData(validated.clubWidgetId)
        if (!resolved) return { success: false, error: 'Widget not found' }

        const { dataMap, widget } = resolved
        const slug: string = widget.name

        switch (validated.action) {
            case 'join': {
                if (slug !== 'giveaway') return { success: false, error: 'Invalid action' }
                const participants: GiveawayParticipant[] = dataMap['participants'] ?? []
                if (participants.some((p) => p.user_id === user.id)) {
                    return { success: false, error: 'Already joined' }
                }
                participants.push({ user_id: user.id, joined_at: new Date().toISOString() })
                await updateWidgetDataField(validated.clubWidgetId, 'participants', participants)
                await updateWidgetCacheData(validated.clubWidgetId, { participant_count: participants.length })
                break
            }

            case 'leave': {
                if (slug !== 'giveaway') return { success: false, error: 'Invalid action' }
                const participants: GiveawayParticipant[] = dataMap['participants'] ?? []
                const updated = participants.filter((p) => p.user_id !== user.id)
                await updateWidgetDataField(validated.clubWidgetId, 'participants', updated)
                await updateWidgetCacheData(validated.clubWidgetId, { participant_count: updated.length })
                break
            }

            case 'ask': {
                if (slug !== 'question-box') return { success: false, error: 'Invalid action' }
                const text: string = validated.payload?.['text']
                if (!text?.trim()) return { success: false, error: 'Question text is required' }
                const questions: Question[] = dataMap['questions'] ?? []
                questions.push({
                    id: crypto.randomUUID(),
                    text: text.trim(),
                    created_at: new Date().toISOString(),
                    answer: null,
                })
                await updateWidgetDataField(validated.clubWidgetId, 'questions', questions)
                await updateWidgetCacheData(validated.clubWidgetId, { question_count: questions.length })
                break
            }

            case 'answer': {
                if (slug !== 'question-box') return { success: false, error: 'Invalid action' }
                const { questionId, answer } = validated.payload ?? {}
                if (!questionId || !answer?.trim()) {
                    return { success: false, error: 'Question ID and answer are required' }
                }
                const questions: Question[] = dataMap['questions'] ?? []
                const idx = questions.findIndex((q) => q.id === questionId)
                if (idx === -1) return { success: false, error: 'Question not found' }
                questions[idx] = { ...questions[idx], answer: answer.trim() }
                await updateWidgetDataField(validated.clubWidgetId, 'questions', questions)
                break
            }
        }

        // Revalidate the club page so pinned / feed posts refresh
        const supabase = await createClient()
        const { data: post } = await supabase
            .from('posts')
            .select('club_id')
            .contains('content', { club_widget_id: validated.clubWidgetId })
            .single()

        if (post?.club_id) revalidatePath(`/clubs/${post.club_id}`)

        return { success: true }
    } catch (err) {
        console.error('[interactWithWidgetAction]', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── Generic data update (admin / creator) ────────────────────────────────────

export async function updateWidgetDataAction(
    clubWidgetId: string,
    key: string,
    value: unknown
): Promise<{ success: boolean; error?: string }> {
    try {
        updateWidgetDataFieldSchema.parse({ clubWidgetId, key, value })
        const user = await getAuthUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        await updateWidgetDataField(clubWidgetId, key, value)
        return { success: true }
    } catch (err) {
        console.error('[updateWidgetDataAction]', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
