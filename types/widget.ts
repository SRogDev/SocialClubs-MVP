/**
 * Widget types — EAV + template-driven rendering
 *
 * Architecture:
 *   widgets          → catalog (name, schema with modal/post templates)
 *   club_widgets     → instance of a widget in a club (with cache_data)
 *   club_widgets_data → EAV key-value pairs for each widget instance
 *
 * Both WidgetPost and WidgetModal are generic components driven by
 * the templates stored in widgets.schema. No per-widget components.
 */

// ─── DB row types ──────────────────────────────────────────────────────────────

export interface Widget {
    id: string
    name: string       // slug: 'giveaway' | 'countdown' | 'question-box'
    schema: WidgetSchema
    status: 'active' | 'pending_review' | 'rejected'
    creator_user_id: string | null  // null = platform widget
    version: string
    icon_svg: string | null
    created_at: string
    updated_at: string
}

export interface ClubWidget {
    id: string
    club_id: string
    widget_id: string
    cache_data: ClubWidgetCacheData
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

// ─── Widget schema (stored in widgets.schema jsonb) ───────────────────────────

export interface WidgetSchema {
    slug: string
    pinned?: boolean
    modal_template: ModalTemplate
    post_template: PostTemplate
    data_schema: DataSchema
}

// ─── Modal template (drives WidgetModal generic component) ────────────────────

export type ModalFieldType = 'text' | 'textarea' | 'datetime-local' | 'number' | 'url' | 'select'

export interface ModalField {
    id: string
    label: string
    type: ModalFieldType
    placeholder: string
    required: boolean
    options?: { value: string; label: string }[]   // for 'select' type
    validation?: {
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
        pattern?: string
    }
}

export interface ModalTemplate {
    fields: ModalField[]
    submit_label: string
}

// ─── Post template (drives WidgetPost generic component) ─────────────────────

export type SectionType =
    | 'header'
    | 'text-block'
    | 'date-display'
    | 'stat-row'
    | 'countdown-display'
    | 'action-button'
    | 'text-input-action'
    | 'qa-list'

export interface HeaderSectionConfig {
    icon: string           // Lucide icon name
    title_from: string     // e.g. 'data.title'
}

export interface TextBlockSectionConfig {
    label?: string
    value_from: string
}

export interface DateDisplaySectionConfig {
    label?: string
    value_from: string
    format?: 'full' | 'relative' | 'short'
}

export interface StatConfig {
    label: string
    value_from: string     // e.g. 'cache.participant_count'
    default?: number
}

export interface StatRowSectionConfig {
    stats: StatConfig[]
}

export interface CountdownSectionConfig {
    target_from: string    // e.g. 'data.target_at'
}

export interface UserCheckConfig {
    array_from: string     // e.g. 'data.participants'
    user_id_field: string  // field name inside each item that holds user_id
}

export interface ActionButtonSectionConfig {
    action: string         // e.g. 'join'
    label: string
    leave_label?: string
    user_check?: UserCheckConfig
}

export interface TextInputActionSectionConfig {
    placeholder: string
    action: string         // e.g. 'ask'
    payload_key: string    // key inside payload object, e.g. 'text'
    submit_label?: string
    max_length?: number
}

export interface QAListSectionConfig {
    questions_from: string // e.g. 'data.questions'
    answer_action: string  // e.g. 'answer'
}

export type SectionConfig =
    | HeaderSectionConfig
    | TextBlockSectionConfig
    | DateDisplaySectionConfig
    | StatRowSectionConfig
    | CountdownSectionConfig
    | ActionButtonSectionConfig
    | TextInputActionSectionConfig
    | QAListSectionConfig

export interface PostSection {
    type: SectionType
    config: SectionConfig
}

export interface PostTemplate {
    sections: PostSection[]
}

// ─── Data schema (conceptual, shown in Widget Wizard UI) ─────────────────────

export interface DataFieldSchema {
    type: 'string' | 'number' | 'boolean' | 'datetime' | 'array' | 'object'
    description: string
    items?: Record<string, string>   // shape of array items
}

export type DataSchema = Record<string, DataFieldSchema>

// ─── Cache data stored in club_widgets.cache_data ─────────────────────────────

export interface ClubWidgetCacheData {
    participant_count?: number
    question_count?: number
    [key: string]: any
}

// ─── Per-widget data shapes (EAV values stored in club_widgets_data) ──────────

export interface GiveawayParticipant {
    user_id: string
    joined_at: string
}

export interface Question {
    id: string
    text: string
    created_at: string
    answer?: string | null
}

// ─── Runtime resolved data (returned by /api/widgets/[clubWidgetId]) ──────────

export interface ResolvedWidgetData {
    widget: Widget
    clubWidget: ClubWidget
    /** Flat key→value map of all club_widgets_data rows for this instance */
    dataMap: Record<string, any>
}

// ─── Widget Wizard (AI-generated widgets, future) ─────────────────────────────

export type WidgetWizardStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'

export interface WidgetWizardSession {
    id: string
    user_id: string
    messages: { role: 'user' | 'assistant'; content: string }[]
    generated_schema: WidgetSchema | null
    status: WidgetWizardStatus
    rejection_reason: string | null
    created_at: string
    updated_at: string
}
