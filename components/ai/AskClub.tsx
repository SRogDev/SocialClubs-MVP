'use client'

/**
 * AskClub — "Pregunta al club" widget (Community Manager v0).
 *
 * Spanish-first: a member types a question, POSTs it to /api/ai/faq, and
 * sees the club AI's answer. Always shows the "Respuesta generada por IA
 * del club" disclosure; when the answer is not grounded in the club FAQ,
 * a "no estoy seguro" notice tells the member to confirm with the creator.
 */
import { useState } from 'react'
import { Loader2, Send, Sparkles, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FaqApiResult {
    answer: string | null
    grounded: boolean
    confidence: number
    reason?: string
}

interface AskClubProps {
    clubId: string
    clubColor?: string
}

export function AskClub({ clubId, clubColor = '#f97316' }: AskClubProps) {
    const [question, setQuestion] = useState('')
    const [result, setResult] = useState<FaqApiResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const ask = async (e: React.FormEvent) => {
        e.preventDefault()
        const q = question.trim()
        if (!q || loading) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/ai/faq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clubId, question: q }),
            })
            if (res.status === 429) {
                setError('Demasiadas preguntas seguidas. Espera un momento e inténtalo de nuevo.')
                return
            }
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as { error?: string } | null
                setError(data?.error ?? 'No se pudo obtener la respuesta.')
                return
            }
            setResult((await res.json()) as FaqApiResult)
        } catch {
            setError('Error de conexión. Inténtalo de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <span
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{
                            background: `${clubColor}1a`,
                            border: `1px solid ${clubColor}30`,
                        }}
                        aria-hidden
                    >
                        <Sparkles size={16} style={{ color: clubColor }} />
                    </span>
                    Pregunta al club
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <form onSubmit={ask} className="flex gap-2">
                    <label htmlFor="ask-club-input" className="sr-only">
                        Pregunta sobre el club
                    </label>
                    <Input
                        id="ask-club-input"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="¿Cuánto cuesta unirse?"
                        maxLength={1000}
                        disabled={loading}
                        autoComplete="off"
                    />
                    <Button
                        type="submit"
                        disabled={loading || !question.trim()}
                        aria-label="Preguntar"
                        className="shrink-0 cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" aria-hidden />
                        ) : (
                            <Send size={16} aria-hidden />
                        )}
                    </Button>
                </form>

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                {result && !error && (
                    <div
                        aria-live="polite"
                        className="space-y-2 rounded-xl border border-border/60 bg-muted/40 p-3"
                    >
                        {result.answer === null ? (
                            <p className="text-sm text-muted-foreground">
                                Este club aún no tiene preguntas frecuentes configuradas.
                            </p>
                        ) : (
                            <>
                                <p className="text-sm leading-relaxed">{result.answer}</p>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Sparkles size={12} aria-hidden />
                                    <span>Respuesta generada por IA del club</span>
                                </div>
                                {!result.grounded && (
                                    <div
                                        className={cn(
                                            'flex items-start gap-1.5 text-xs',
                                            'text-amber-700 dark:text-amber-400',
                                        )}
                                    >
                                        <TriangleAlert
                                            size={12}
                                            className="mt-0.5 shrink-0"
                                            aria-hidden
                                        />
                                        <span>
                                            No estoy seguro de esta respuesta — confírmala con el
                                            creador del club.
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
