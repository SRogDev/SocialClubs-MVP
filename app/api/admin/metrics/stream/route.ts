import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlatformMetrics } from '@/services/adminService'

/**
 * GET /api/admin/metrics/stream
 * Server-Sent Events stream para métricas en tiempo real
 * Solo accesible por admins
 */
export async function GET(request: NextRequest) {
    // Verificar autenticación y rol de admin
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return new Response('No autenticado', { status: 401 })
    }

    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'admin') {
        return new Response('No tienes permisos de administrador', { status: 403 })
    }

    // Crear ReadableStream para SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            // Función para enviar métricas
            const sendMetrics = async () => {
                try {
                    const metrics = await getPlatformMetrics()
                    const data = `data: ${JSON.stringify(metrics)}\n\n`
                    controller.enqueue(encoder.encode(data))
                } catch (error) {
                    console.error('Error fetching metrics for SSE:', error)
                    controller.enqueue(encoder.encode('event: error\ndata: Error fetching metrics\n\n'))
                }
            }

            // Enviar métricas inmediatamente
            await sendMetrics()

            // Configurar intervalo para actualizaciones cada 30 segundos
            const intervalId = setInterval(sendMetrics, 30000)

            // Cleanup cuando se cierra la conexión
            request.signal.addEventListener('abort', () => {
                clearInterval(intervalId)
                controller.close()
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no', // Nginx buffering
        },
    })
}
