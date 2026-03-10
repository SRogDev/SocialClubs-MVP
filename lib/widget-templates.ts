/**
 * Widget template registry — client-side source of truth for the widget picker.
 * These 3 entries mirror exactly what is seeded in widgets table.
 * The post_template / modal_template here must stay in sync with the DB seed.
 *
 * External / user-created widgets are fetched from the DB at runtime.
 */

import type { WidgetSchema } from '@/types/widget'

export interface WidgetRegistryEntry {
    slug: string
    name: string
    icon: string          // Lucide icon name
    description: string
    schema: WidgetSchema
}

export const PLATFORM_WIDGETS: WidgetRegistryEntry[] = [
    {
        slug: 'giveaway',
        name: 'Giveaway',
        icon: 'Gift',
        description: 'Host a giveaway — members join and you pick a winner',
        schema: {
            slug: 'giveaway',
            pinned: false,
            modal_template: {
                fields: [
                    { id: 'title',      label: 'Giveaway Title',           type: 'text',          placeholder: 'e.g. Win a free premium month!',  required: true },
                    { id: 'prize',      label: 'What are you giving away?', type: 'textarea',      placeholder: 'Describe the prize in detail…',    required: true },
                    { id: 'resolve_at', label: 'Draw Date & Time',          type: 'datetime-local', placeholder: '',                                required: true },
                ],
                submit_label: 'Launch Giveaway',
            },
            post_template: {
                sections: [
                    { type: 'header',        config: { icon: 'Gift', title_from: 'data.title' } },
                    { type: 'text-block',    config: { label: 'Prize', value_from: 'data.prize' } },
                    { type: 'date-display',  config: { label: 'Draw date', value_from: 'data.resolve_at', format: 'full' } },
                    { type: 'stat-row',      config: { stats: [{ label: 'joined', value_from: 'cache.participant_count', default: 0 }] } },
                    { type: 'action-button', config: { action: 'join', label: 'Join Giveaway', leave_label: 'Leave Giveaway', user_check: { array_from: 'data.participants', user_id_field: 'user_id' } } },
                ],
            },
            data_schema: {
                title:        { type: 'string',   description: 'Giveaway title' },
                prize:        { type: 'string',   description: 'Prize description' },
                resolve_at:   { type: 'datetime', description: 'When the winner is picked' },
                participants: { type: 'array',    description: 'Users who joined', items: { user_id: 'string', joined_at: 'datetime' } },
            },
        },
    },
    {
        slug: 'countdown',
        name: 'Countdown',
        icon: 'Timer',
        description: 'Pin a live countdown to your channel for an upcoming event',
        schema: {
            slug: 'countdown',
            pinned: true,
            modal_template: {
                fields: [
                    { id: 'title',     label: 'What are you counting down to?', type: 'text',          placeholder: 'e.g. Season Finale, Product Launch…', required: true },
                    { id: 'target_at', label: 'Target Date & Time',             type: 'datetime-local', placeholder: '',                                     required: true },
                ],
                submit_label: 'Start Countdown',
            },
            post_template: {
                sections: [
                    { type: 'header',            config: { icon: 'Timer', title_from: 'data.title' } },
                    { type: 'countdown-display', config: { target_from: 'data.target_at' } },
                ],
            },
            data_schema: {
                title:     { type: 'string',   description: 'What you are counting down to' },
                target_at: { type: 'datetime', description: 'The target date and time' },
            },
        },
    },
    {
        slug: 'question-box',
        name: 'Question Box',
        icon: 'MessageCircleQuestion',
        description: "Let your members ask you anything — anonymously",
        schema: {
            slug: 'question-box',
            pinned: false,
            modal_template: {
                fields: [
                    { id: 'title', label: 'Topic', type: 'text', placeholder: 'e.g. Ask me anything about fitness!', required: true },
                ],
                submit_label: 'Open Question Box',
            },
            post_template: {
                sections: [
                    { type: 'header',            config: { icon: 'MessageCircleQuestion', title_from: 'data.title' } },
                    { type: 'stat-row',          config: { stats: [{ label: 'questions received', value_from: 'cache.question_count', default: 0 }] } },
                    { type: 'qa-list',           config: { questions_from: 'data.questions', answer_action: 'answer' } },
                    { type: 'text-input-action', config: { placeholder: 'Ask anonymously…', action: 'ask', payload_key: 'text', submit_label: 'Send', max_length: 300 } },
                ],
            },
            data_schema: {
                title:     { type: 'string', description: 'Question box topic' },
                questions: { type: 'array',  description: 'Submitted questions', items: { id: 'string', text: 'string', created_at: 'datetime', answer: 'string|null' } },
            },
        },
    },
]
