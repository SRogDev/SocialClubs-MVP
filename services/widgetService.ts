/**
 * Widget Service — DB CRUD for the widget EAV pattern
 * Tables: widgets (catalog) → club_widgets (instances) → club_widgets_data (key-value)
 */

import { createClient } from '@/lib/supabase/server'
import type { Widget, ClubWidget, ClubWidgetData, ResolvedWidgetData } from '@/types/widget'

// ─── Catalog ──────────────────────────────────────────────────────────────────

/** Fetch all base widget types from the catalog table */
export async function getBaseWidgets(): Promise<Widget[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch widgets: ${error.message}`)
    return data ?? []
}

/** Resolve a widget by its slug (name column) */
export async function getWidgetBySlug(slug: string): Promise<Widget | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('name', slug)
        .single()

    if (error) return null
    return data
}

// ─── Club widget instances ─────────────────────────────────────────────────────

/**
 * Publish a widget in a club:
 * 1. Creates a club_widgets row
 * 2. Creates one club_widgets_data row per form field
 * 3. Creates empty participants / questions array for interactive widgets
 * 4. Creates the post row (type='widget')
 * Returns the new post id
 */
export async function publishWidget(
    clubId: string,
    widgetId: string,
    widgetSlug: string,
    formData: Record<string, string>,
    userId: string,
    pinned: boolean
): Promise<{ postId: string; clubWidgetId: string }> {
    const supabase = await createClient()

    // 1. Create club_widget instance
    const { data: clubWidget, error: cwError } = await supabase
        .from('club_widgets')
        .insert({ club_id: clubId, widget_id: widgetId, cache_data: {} })
        .select()
        .single()

    if (cwError || !clubWidget) {
        throw new Error(`Failed to create club widget: ${cwError?.message}`)
    }

    // 2. Insert one row per form field
    const dataRows = Object.entries(formData).map(([key, value]) => ({
        club_widget_id: clubWidget.id,
        key,
        value,
    }))

    // 3. Add empty interaction bucket depending on widget type
    if (widgetSlug === 'giveaway') {
        dataRows.push({ club_widget_id: clubWidget.id, key: 'participants', value: [] as any })
    } else if (widgetSlug === 'question-box') {
        dataRows.push({ club_widget_id: clubWidget.id, key: 'questions', value: [] as any })
    }

    const { error: dataError } = await supabase
        .from('club_widgets_data')
        .insert(dataRows)

    if (dataError) {
        // Rollback club_widget row
        await supabase.from('club_widgets').delete().eq('id', clubWidget.id)
        throw new Error(`Failed to create widget data: ${dataError.message}`)
    }

    // 4. Create the post
    const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
            club_id: clubId,
            user_id: userId,
            type: 'widget',
            pinned,
            content: { club_widget_id: clubWidget.id, widget_slug: widgetSlug },
        })
        .select('id')
        .single()

    if (postError || !post) {
        // Rollback
        await supabase.from('club_widgets_data').delete().eq('club_widget_id', clubWidget.id)
        await supabase.from('club_widgets').delete().eq('id', clubWidget.id)
        throw new Error(`Failed to create widget post: ${postError?.message}`)
    }

    return { postId: post.id, clubWidgetId: clubWidget.id }
}

// ─── Data reads ───────────────────────────────────────────────────────────────

/**
 * Fetch all data for a club_widget and return a flat key→value map
 */
export async function getClubWidgetData(clubWidgetId: string): Promise<ResolvedWidgetData | null> {
    const supabase = await createClient()

    // Fetch club_widget with widget joined
    const { data: clubWidget, error: cwError } = await supabase
        .from('club_widgets')
        .select('*, widget:widgets(*)')
        .eq('id', clubWidgetId)
        .single()

    if (cwError || !clubWidget) return null

    // Fetch all data rows
    const { data: dataRows, error: drError } = await supabase
        .from('club_widgets_data')
        .select('key, value')
        .eq('club_widget_id', clubWidgetId)

    if (drError) return null

    const dataMap: Record<string, any> = {}
    for (const row of dataRows ?? []) {
        dataMap[row.key] = row.value
    }

    return {
        widget: clubWidget.widget as unknown as Widget,
        clubWidget: {
            id: clubWidget.id,
            club_id: clubWidget.club_id,
            widget_id: clubWidget.widget_id,
            cache_data: clubWidget.cache_data ?? {},
            created_at: clubWidget.created_at,
            updated_at: clubWidget.updated_at,
        },
        dataMap,
    }
}

// ─── Data writes ──────────────────────────────────────────────────────────────

/** Upsert a single key in club_widgets_data */
export async function updateWidgetDataField(
    clubWidgetId: string,
    key: string,
    value: any
): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('club_widgets_data')
        .upsert(
            { club_widget_id: clubWidgetId, key, value },
            { onConflict: 'club_widget_id,key' }
        )

    if (error) throw new Error(`Failed to update widget data: ${error.message}`)
}

/** Patch cache_data in club_widgets */
export async function updateWidgetCacheData(
    clubWidgetId: string,
    patch: Record<string, any>
): Promise<void> {
    const supabase = await createClient()

    // Read existing cache_data first
    const { data: cw } = await supabase
        .from('club_widgets')
        .select('cache_data')
        .eq('id', clubWidgetId)
        .single()

    const merged = { ...(cw?.cache_data ?? {}), ...patch }

    const { error } = await supabase
        .from('club_widgets')
        .update({ cache_data: merged })
        .eq('id', clubWidgetId)

    if (error) throw new Error(`Failed to update widget cache: ${error.message}`)
}
