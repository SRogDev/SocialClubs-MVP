/**
 * POST /api/bookings/[id]/complete
 *
 * Marks a booking as completed and releases 90% escrow to the creator.
 * Can be called by the creator after the videocall ends,
 * or automatically by the cron job after the scheduled time passes.
 */
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { releaseEscrowToCreator } from '@/services/stripeService'

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

        // Fetch booking with club & creator's connected Stripe account
        const { data: booking, error: bookingError } = await supabase
            .from('users_agendas')
            .select('*, clubs(creator, connected_stripe_accounts(stripe_account_id))')
            .eq('id', bookingId)
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
        }

        // Only the creator or admin can mark as complete
        const clubCreator = (booking.clubs as any)?.creator
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        const isAdmin = userData?.role === 'admin'

        if (user.id !== clubCreator && !isAdmin) {
            return NextResponse.json({ error: 'Solo el creator puede marcar la videollamada como completada' }, { status: 403 })
        }

        if (!booking.payment_intent_id) {
            return NextResponse.json({ error: 'El booking no tiene pago registrado' }, { status: 400 })
        }
        if (booking.escrow_status === 'released') {
            return NextResponse.json({ error: 'El escrow ya fue liberado' }, { status: 400 })
        }
        if (booking.escrow_status === 'refunded') {
            return NextResponse.json({ error: 'El pago fue reembolsado' }, { status: 400 })
        }

        const connectedAccountId =
            (booking.clubs as any)?.connected_stripe_accounts?.stripe_account_id

        if (!connectedAccountId) {
            return NextResponse.json(
                { error: 'El creator no tiene cuenta Stripe Connect configurada' },
                { status: 400 }
            )
        }

        const body = await request.json().catch(() => ({}))
        const totalAmountCents: number = body.totalAmountCents ?? booking.price_cents ?? 0

        // Mark booking as completed
        await supabase
            .from('users_agendas')
            .update({ status: 'completed' })
            .eq('id', bookingId)

        // Release escrow to creator
        await releaseEscrowToCreator({
            bookingId,
            paymentIntentId: booking.payment_intent_id,
            connectedAccountId,
            totalAmountCents,
            creatorUserId: clubCreator,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error completing booking:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error al completar el booking' },
            { status: 500 }
        )
    }
}
