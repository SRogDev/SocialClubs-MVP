'use client'

import { useEffect, useCallback, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { LevelUpMetadata } from '@/types/notification'

/**
 * Hook que escucha en real-time los cambios de nivel de los clubs del usuario.
 *
 * Se suscribe a INSERT en la tabla `notifications` donde type = 'club_level_up'
 * y user_id = el usuario actual. Cuando el trigger de BD genera la notificación
 * de level-up, este hook la detecta y devuelve los datos para mostrar la animación.
 *
 * Requiere que Realtime esté habilitado en la tabla `notifications`.
 */
export function useClubLevelListener(userId: string | null) {
    const [levelUpData, setLevelUpData] = useState<LevelUpMetadata | null>(null)

    useEffect(() => {
        if (!userId) return

        const supabase = createClient()

        const channel = supabase
            .channel(`level-up-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newRow = payload.new as Record<string, unknown>

                    // Solo reaccionar a notificaciones de level-up
                    if (newRow.type !== 'club_level_up') return

                    const metadata = newRow.metadata as LevelUpMetadata | null
                    if (metadata && metadata.new_level) {
                        setLevelUpData(metadata)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    const dismiss = useCallback(() => {
        setLevelUpData(null)
    }, [])

    return { levelUpData, dismiss }
}
