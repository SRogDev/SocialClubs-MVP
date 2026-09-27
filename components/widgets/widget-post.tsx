'use client'

/**
 * WidgetPost — generic published-widget renderer.
 *
 * Reads `post_template.sections` from the widget record and renders
 * each section through the section dispatcher below. No per-widget
 * components exist; every widget is described purely by its template.
 *
 * Usage:
 *   <WidgetPost clubWidgetId="..." userId={user.id} isCreator={false} />
 *   <WidgetPost previewData={mockData} userId={null} />   ← modal preview
 */

import { format, formatDistanceToNow } from 'date-fns'
import {
    Gift, Timer, MessageCircleQuestion, Puzzle, Clock, Users, Star,
    Zap, Trophy, Calendar, Sparkles, Heart, Globe, Bell, type LucideIcon,
} from 'lucide-react'
import { useState, useEffect } from 'react'

import { interactWithWidgetAction } from '@/app/actions/widgetActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useWidgetData } from '@/hooks/swr/useWidgetData'
import type {
    ResolvedWidgetData,
    PostSection,
    HeaderSectionConfig,
    TextBlockSectionConfig,
    DateDisplaySectionConfig,
    StatRowSectionConfig,
    CountdownSectionConfig,
    ActionButtonSectionConfig,
    TextInputActionSectionConfig,
    QAListSectionConfig,
    Question,
    GiveawayParticipant,
} from '@/types/widget'

// ─── Icon map (extend as more widget types are added) ─────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
    Gift, Timer, MessageCircleQuestion, Puzzle, Clock, Users, Star,
    Zap, Trophy, Calendar, Sparkles, Heart, Globe, Bell,
}

// ─── Path resolver: 'data.title' → dataMap['title'] ──────────────────────────
function resolve(path: string, dataMap: Record<string, any>, cacheData: Record<string, any>): any {
    if (path.startsWith('data.'))  return dataMap[path.slice(5)]
    if (path.startsWith('cache.')) return cacheData[path.slice(6)]
    return undefined
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface WidgetPostProps {
    clubWidgetId?: string
    previewData?: ResolvedWidgetData   // pass for in-modal preview (skips SWR)
    userId: string | null
    isCreator?: boolean
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WidgetPost({
    clubWidgetId,
    previewData,
    userId,
    isCreator = false,
}: WidgetPostProps) {
    const { data: fetched, isLoading, mutate } = useWidgetData(
        previewData ? null : clubWidgetId
    )
    const resolved = previewData ?? fetched

    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [inputValues, setInputValues]     = useState<Record<string, string>>({})
    const [answeringId, setAnsweringId]     = useState<string | null>(null)
    const [answerText, setAnswerText]       = useState('')

    if (!previewData && isLoading) {
        return <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
    }
    if (!resolved) return null

    const { widget, clubWidget, dataMap } = resolved
    const sections = widget.schema?.post_template?.sections
    if (!sections?.length) return null

    const r = (path: string) => resolve(path, dataMap, clubWidget.cache_data)

    async function act(action: string, payload?: Record<string, any>) {
        if (!clubWidgetId || previewData) return   // no-op in preview
        setActionLoading(action)
        await interactWithWidgetAction({
            clubWidgetId,
            action: action as any,
            payload,
        })
        mutate?.()
        setActionLoading(null)
    }

    // ─── Section dispatcher ───────────────────────────────────────────────────
    function renderSection(section: PostSection, idx: number) {
        switch (section.type) {

            // ── Header ────────────────────────────────────────────────────────
            case 'header': {
                const cfg = section.config as HeaderSectionConfig
                const Icon = ICON_MAP[cfg.icon] ?? Puzzle
                return (
                    <div key={idx} className="flex items-center gap-2">
                        <Icon size={18} className="text-primary shrink-0" />
                        <h3 className="font-semibold text-sm leading-tight">{r(cfg.title_from)}</h3>
                    </div>
                )
            }

            // ── Text block ────────────────────────────────────────────────────
            case 'text-block': {
                const cfg = section.config as TextBlockSectionConfig
                return (
                    <div key={idx} className="space-y-0.5">
                        {cfg.label && (
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {cfg.label}
                            </p>
                        )}
                        <p className="text-sm">{r(cfg.value_from)}</p>
                    </div>
                )
            }

            // ── Date display ──────────────────────────────────────────────────
            case 'date-display': {
                const cfg = section.config as DateDisplaySectionConfig
                const raw  = r(cfg.value_from)
                const date = raw ? new Date(raw) : null
                const text = date
                    ? cfg.format === 'relative'
                        ? formatDistanceToNow(date, { addSuffix: true })
                        : cfg.format === 'short'
                            ? format(date, 'MMM d, yyyy')
                            : format(date, 'PPP p')
                    : '—'
                return (
                    <div key={idx} className="space-y-0.5">
                        {cfg.label && (
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {cfg.label}
                            </p>
                        )}
                        <p className="text-sm tabular-nums">{text}</p>
                    </div>
                )
            }

            // ── Stat row ──────────────────────────────────────────────────────
            case 'stat-row': {
                const cfg = section.config as StatRowSectionConfig
                return (
                    <div key={idx} className="flex gap-5">
                        {cfg.stats.map((stat, si) => {
                            const value = r(stat.value_from) ?? stat.default ?? 0
                            return (
                                <div key={si}>
                                    <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                                </div>
                            )
                        })}
                    </div>
                )
            }

            // ── Countdown display ─────────────────────────────────────────────
            case 'countdown-display': {
                const cfg = section.config as CountdownSectionConfig
                return <CountdownDisplay key={idx} targetIso={r(cfg.target_from)} />
            }

            // ── Action button (join / leave) ───────────────────────────────────
            case 'action-button': {
                const cfg      = section.config as ActionButtonSectionConfig
                const arr: GiveawayParticipant[] = cfg.user_check
                    ? (r(cfg.user_check.array_from) ?? [])
                    : []
                const isIn     = userId && Array.isArray(arr)
                    ? arr.some((item) => item[cfg.user_check!.user_id_field] === userId)
                    : false
                const action   = isIn ? 'leave' : cfg.action
                const label    = isIn ? (cfg.leave_label ?? 'Leave') : cfg.label
                return (
                    <Button
                        key={idx}
                        size="sm"
                        variant={isIn ? 'outline' : 'default'}
                        className="w-full"
                        disabled={!userId || !!previewData || actionLoading === action}
                        onClick={() => act(action)}
                    >
                        {actionLoading === action ? 'Loading…' : label}
                    </Button>
                )
            }

            // ── Text input → action (anonymous ask) ───────────────────────────
            case 'text-input-action': {
                const cfg      = section.config as TextInputActionSectionConfig
                const fieldKey = `input-${idx}`
                return (
                    <div key={idx} className="space-y-2">
                        <Textarea
                            placeholder={cfg.placeholder}
                            value={inputValues[fieldKey] ?? ''}
                            onChange={(e) =>
                                setInputValues((p) => ({ ...p, [fieldKey]: e.target.value }))
                            }
                            rows={2}
                            maxLength={cfg.max_length ?? 500}
                            className="resize-none text-sm"
                            disabled={!!previewData}
                        />
                        <Button
                            size="sm"
                            className="w-full"
                            disabled={
                                !userId ||
                                !!previewData ||
                                !inputValues[fieldKey]?.trim() ||
                                actionLoading === cfg.action
                            }
                            onClick={async () => {
                                await act(cfg.action, {
                                    [cfg.payload_key]: inputValues[fieldKey],
                                })
                                setInputValues((p) => ({ ...p, [fieldKey]: '' }))
                            }}
                        >
                            {actionLoading === cfg.action ? 'Sending…' : (cfg.submit_label ?? 'Send')}
                        </Button>
                    </div>
                )
            }

            // ── Q&A list ──────────────────────────────────────────────────────
            case 'qa-list': {
                const cfg       = section.config as QAListSectionConfig
                const questions: Question[] = r(cfg.questions_from) ?? []
                return (
                    <div key={idx} className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {questions.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-3">
                                No questions yet. Be the first!
                            </p>
                        )}
                        {questions.map((q) => (
                            <div key={q.id} className="rounded-lg bg-muted/50 p-2.5 space-y-1.5">
                                <p className="text-xs leading-relaxed">{q.text}</p>
                                {q.answer ? (
                                    <p className="text-xs text-primary font-medium">↳ {q.answer}</p>
                                ) : isCreator && !previewData ? (
                                    answeringId === q.id ? (
                                        <div className="flex gap-1.5 pt-0.5">
                                            <input
                                                className="flex-1 text-xs border rounded-md px-2 py-1 bg-background"
                                                placeholder="Your answer…"
                                                value={answerText}
                                                onChange={(e) => setAnswerText(e.target.value)}
                                            />
                                            <Button
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={async () => {
                                                    await act(cfg.answer_action, {
                                                        questionId: q.id,
                                                        answer: answerText,
                                                    })
                                                    setAnsweringId(null)
                                                    setAnswerText('')
                                                }}
                                            >
                                                Post
                                            </Button>
                                        </div>
                                    ) : (
                                        <button
                                            className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                                            onClick={() => {
                                                setAnsweringId(q.id)
                                                setAnswerText('')
                                            }}
                                        >
                                            Answer
                                        </button>
                                    )
                                ) : null}
                            </div>
                        ))}
                    </div>
                )
            }

            default:
                return null
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
                {sections.map((s, i) => renderSection(s, i))}
            </CardContent>
        </Card>
    )
}

// ─── CountdownDisplay — live ticking sub-component ───────────────────────────
function CountdownDisplay({ targetIso }: { targetIso: string }) {
    const [, setTick] = useState(0)

    useEffect(() => {
        const id = setInterval(() => setTick((n) => n + 1), 1000)
        return () => clearInterval(id)
    }, [])

    const diff = Math.max(0, new Date(targetIso).getTime() - Date.now())

    if (diff === 0) {
        return (
            <p className="text-center text-sm font-semibold text-muted-foreground py-2">
                Event has passed
            </p>
        )
    }

    const parts = [
        { value: Math.floor(diff / 86_400_000),              label: 'd' },
        { value: Math.floor((diff % 86_400_000) / 3_600_000), label: 'h' },
        { value: Math.floor((diff % 3_600_000) / 60_000),     label: 'm' },
        { value: Math.floor((diff % 60_000) / 1_000),         label: 's' },
    ]

    return (
        <div className="flex justify-center gap-4 py-2">
            {parts.map(({ value, label }) => (
                <div key={label} className="text-center">
                    <span className="text-2xl font-mono font-bold tabular-nums">
                        {String(value).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-muted-foreground ml-0.5">{label}</span>
                </div>
            ))}
        </div>
    )
}
