/**
 * POST /api/bookings/[id]/refund
 *
 * Refunds 90% of the booking payment to the user.
 * The platform keeps the 10% fee.
 * Can be triggered by the user (cancellation) or automatically (no-show).
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

        // Fetch booking details
        const { data: booking, error: bookingError } = await supabase
            .from('users_agendas')
            .select('*, clubs(creator)')
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
        }

        // Only the user who booked, the club creator, or an admin can request a refund
        const isBookingUser = booking.user_id === user.id
        const isCreator = (booking.clubs as any)?.creator === user.id
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        const isAdmin = userData?.role === 'admin'

        if (!isBookingUser && !isCreator && !isAdmin) {
            return NextResponse.json({ error: 'Sin permisos para reembolsar este booking' }, { status: 403 })
        }

        // Check booking is refundable
        if (!booking.payment_intent_id) {
            return NextResponse.json({ error: 'El booking no tiene pago registrado' }, { status: 400 })
        }
        if (booking.escrow_status === 'refunded') {
            return NextResponse.json({ error: 'Este booking ya fue reembolsado' }, { status: 400 })
        }
        if (booking.escrow_status === 'released') {
            return NextResponse.json({ error: 'El pago ya fue liberado al creator' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const totalAmountCents: number = body.totalAmountCents ?? booking.price_cents ?? 0

        const refund = await createBookingRefund({
            bookingId,
            paymentIntentId: booking.payment_intent_id,
            totalAmountCents,
            userId: booking.user_id,
        })

        return NextResponse.json({ success: true, refundId: refund.id })
    } catch (error) {
        console.error('Error processing refund:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error al procesar el reembolso' },
            { status: 500 }
        )
    }
}
