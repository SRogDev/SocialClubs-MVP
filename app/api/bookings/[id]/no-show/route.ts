/**
 * POST /api/bookings/[id]/no-show
 *
 * Marks a booking as creator no-show and triggers 90% refund to the user.
 * Called by the cron job after the scheduled time passes without room creation,
 * or manually by an admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBookingRefund } from '@/services/stripeService'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const limited = await rateLimit(request, RATE_LIMITS.MUTATION)
    if (limited) return limited

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const bookingId = parseInt(params.id, 10)
        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'ID de booking inválido' }, { status: 400 })
        }

        // Only admins or the booking user can flag a no-show
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        const isAdmin = userData?.role === 'admin'

        const { data: booking, error: bookingError } = await supabase
            .from('users_agendas')
            .select('*')
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
        }

        const isBookingUser = booking.user_id === user.id

        if (!isAdmin && !isBookingUser) {
            return NextResponse.json({ error: 'Sin permisos para reportar no-show' }, { status: 403 })
        }

        if (!booking.payment_intent_id) {
            return NextResponse.json({ error: 'El booking no tiene pago registrado' }, { status: 400 })
        }
        if (['refunded', 'released'].includes(booking.escrow_status)) {
            return NextResponse.json({ error: 'El pago ya fue procesado' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const totalAmountCents: number = body.totalAmountCents ?? booking.price_cents ?? 0

        // Mark no-show
        await supabase
            .from('users_agendas')
            .update({
                status: 'no_show',
                creator_no_show: true,
            })
            .eq('id', bookingId)

        // Refund 90% to user
        const refund = await createBookingRefund({
            bookingId,
            paymentIntentId: booking.payment_intent_id,
            totalAmountCents,
            userId: booking.user_id,
        })

        return NextResponse.json({ success: true, refundId: refund.id })
    } catch (error) {
        console.error('Error processing no-show:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error al procesar no-show' },
            { status: 500 }
        )
    }
}
