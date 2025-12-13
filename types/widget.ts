/**
 * Widget types based on database.sql schema
 */

export interface Widget {
    id: string
    name: string
    schema: Record<string, any>
    created_at: string
    updated_at: string
}

export interface ClubWidget {
    id: string
    club_id: string
    widget_id: string
    cache_data: Record<string, any>
    created_at: string
    updated_at: string
}

export interface ClubWidgetData {
    id: string
    club_widget_id: string
    key: string
    value: any | null
    created_at: string
    updated_at: string
}

// Widget data structure for components
export interface WidgetData {
    type: string
    title: string
    [key: string]: any
}
