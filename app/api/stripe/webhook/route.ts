import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { confirmBooking } from '@/services/bookingService';

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 * Confirms booking when payment is successful
 *
 * Important: Configure this webhook URL in Stripe Dashboard
 * https://dashboard.stripe.com/webhooks
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
        }

        // TODO: Implement Stripe webhook verification and handling
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
        // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
        //
        // let event
        // try {
        //   event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        // } catch (err: any) {
        //   console.error('Webhook signature verification failed:', err.message)
        //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        // }
        //
        // switch (event.type) {
        //   case 'checkout.session.completed': {
        //     const session = event.data.object
        //     const { appointment_id, user_id, club_id, date } = session.metadata
        //
        //     // Create booking with confirmed status
        //     const booking = await createBooking(
        //       { appointment_id: parseInt(appointment_id), date },
        //       user_id,
        //       session.payment_intent as string
        //     )
        //
        //     console.log('[Stripe Webhook] Booking created:', booking.id)
        //     break
        //   }
        //
        //   case 'charge.refunded': {
        //     // Handle refund
        //     const charge = event.data.object
        //     // TODO: Mark booking as cancelled/refunded
        //     break
        //   }
        //
        //   default:
        //     console.log(`Unhandled event type: ${event.type}`)
        // }
        //
        // return NextResponse.json({ received: true })

        // Placeholder response
        console.log('[Stripe Webhook] Received webhook (placeholder mode)');
        return NextResponse.json({
            received: false,
            placeholder: true,
            message: 'Stripe webhook aún no implementado. Configura STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET.',
        });
    } catch (error: any) {
        console.error('[Stripe Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
