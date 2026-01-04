import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { confirmBooking } from '@/services/bookingService';
import { recordPayment } from '@/services/stripeService';
import Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * 
 * Webhook endpoint para recibir eventos de Stripe.
 * 
 * EVENTOS CRÍTICOS:
 * - checkout.session.completed: Pago completado (videollamada o suscripción inicial)
 * - invoice.paid: Renovación de suscripción exitosa
 * - invoice.payment_failed: Fallo en pago de suscripción
 * - customer.subscription.updated: Cambios en suscripción
 * - customer.subscription.deleted: Cancelación de suscripción
 * - account.updated: Cambios en cuenta Connect
 * - charge.refunded: Reembolso procesado
 * - payment_intent.payment_failed: Fallo en pago
 * 
 * IMPORTANTE:
 * - Todas las operaciones son idempotentes (usan txn_stripe_id único)
 * - Rate limiting NO aplicado (Stripe controla retry logic)
 * - Logging exhaustivo para debugging de transacciones
 */
export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        console.error('❌ Stripe webhook: Missing signature');
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        // Verificar firma del webhook
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (error: any) {
        console.error('❌ Stripe webhook signature verification failed:', error.message);
        return NextResponse.json(
            { error: `Webhook signature verification failed: ${error.message}` },
            { status: 400 }
        );
    }

    console.log(`✅ Stripe webhook received: ${event.type} [${event.id}]`);

    try {
        // Router de eventos
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'account.updated':
                await handleAccountUpdated(event.data.object as Stripe.Account);
                break;

            case 'charge.refunded':
                await handleChargeRefunded(event.data.object as Stripe.Charge);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true, event: event.type });
    } catch (error: any) {
        console.error(`❌ Error processing webhook ${event.type}:`, error);
        // Retornar 200 para evitar retry infinito en errores no recuperables
        return NextResponse.json(
            { received: true, error: error.message },
            { status: 200 }
        );
    }
}

// ============================================================================
// HANDLERS DE EVENTOS
// ============================================================================

/**
 * checkout.session.completed
 * 
 * Se dispara cuando un checkout es completado exitosamente.
 * Puede ser para videollamada (mode=payment) o suscripción (mode=subscription).
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const supabase = await createClient();
    const metadata = session.metadata;

    if (!metadata) {
        console.warn('⚠️ Checkout session sin metadata:', session.id);
        return;
    }

    const type = metadata.type; // 'videocall' | 'subscription'

    console.log(`📦 Processing checkout: ${type} [${session.id}]`);

    if (type === 'videocall') {
        // VIDEOLLAMADA: Confirmar booking
        const appointmentId = parseInt(metadata.appointment_id);
        const userId = metadata.user_id;
        const date = metadata.date;

        // Obtener PaymentIntent ID
        const paymentIntentId =
            typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id;

        if (!paymentIntentId) {
            console.error('❌ No PaymentIntent ID found');
            return;
        }

        // Verificar idempotencia
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('txn_stripe_id', paymentIntentId)
            .single();

        if (existingPayment) {
            console.log(`ℹ️ Payment already processed: ${paymentIntentId}`);
            return;
        }

        // Confirmar booking
        const booking = await confirmBooking(appointmentId, paymentIntentId);

        // Registrar pago
        await recordPayment({
            userId,
            amount: session.amount_total || 0,
            txnType: 'payment',
            txnStripeId: paymentIntentId,
            status: 'completed',
            direction: 'in',
        });

        console.log(`✅ Booking confirmed: ${booking.id} - Payment: ${paymentIntentId}`);
    } else if (type === 'subscription') {
        // SUSCRIPCIÓN: Crear users_membership
        const userId = metadata.user_id;
        const membershipId = metadata.membership_id;
        const subscriptionId =
            typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id;

        if (!subscriptionId) {
            console.error('❌ No Subscription ID found');
            return;
        }

        // Verificar idempotencia
        const { data: existing } = await supabase
            .from('users_memberships')
            .select('id')
            .eq('user', userId)
            .eq('membership', membershipId)
            .eq('stripe_subscription_id', subscriptionId)
            .single();

        if (existing) {
            console.log(`ℹ️ Subscription already created: ${subscriptionId}`);
            return;
        }

        // Obtener subscription details de Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Crear users_membership
        await supabase.from('users_memberships').insert({
            user: userId,
            membership: membershipId,
            status: 'active',
            stripe_subscription_id: subscriptionId,
            expire_date: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        console.log(`✅ Subscription created: ${subscriptionId}`);
    }
}

/**
 * invoice.paid
 * 
 * Se dispara cuando una factura (renovación) es pagada exitosamente.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const supabase = await createClient();
    const subscriptionId =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

    if (!subscriptionId) {
        console.warn('⚠️ Invoice sin subscription ID:', invoice.id);
        return;
    }

    console.log(`💰 Invoice paid: ${invoice.id} - Subscription: ${subscriptionId}`);

    // Actualizar expire_date de la suscripción
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await supabase
        .from('users_memberships')
        .update({
            status: 'active',
            expire_date: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

    // Registrar pago (idempotente)
    const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('txn_stripe_id', invoice.id)
        .single();

    if (!existingPayment && invoice.customer_email) {
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', invoice.customer_email)
            .single();

        if (user) {
            await recordPayment({
                userId: user.id,
                amount: invoice.amount_paid,
                txnType: 'payment',
                txnStripeId: invoice.id,
                status: 'completed',
                direction: 'in',
            });
        }
    }

    console.log(`✅ Subscription renewed: ${subscriptionId}`);
}

/**
 * invoice.payment_failed
 * 
 * Se dispara cuando falla el pago de una factura (renovación).
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const supabase = await createClient();
    const subscriptionId =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

    if (!subscriptionId) return;

    console.log(`❌ Invoice payment failed: ${invoice.id} - Subscription: ${subscriptionId}`);

    // Actualizar status a 'past_due'
    await supabase
        .from('users_memberships')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', subscriptionId);

    // TODO: Enviar email de notificación al usuario
    console.log(`⚠️ Subscription marked as past_due: ${subscriptionId}`);
}

/**
 * customer.subscription.updated
 * 
 * Se dispara cuando cambia el estado de una suscripción.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const supabase = await createClient();

    console.log(`🔄 Subscription updated: ${subscription.id} - Status: ${subscription.status}`);

    // Mapear status de Stripe a nuestro schema
    let status: string = subscription.status;
    if (subscription.status === 'trialing') status = 'active';
    if (subscription.status === 'canceled') status = 'canceled';

    await supabase
        .from('users_memberships')
        .update({
            status,
            expire_date: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

    console.log(`✅ Subscription status updated: ${subscription.id} -> ${status}`);
}

/**
 * customer.subscription.deleted
 * 
 * Se dispara cuando una suscripción es cancelada definitivamente.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const supabase = await createClient();

    console.log(`🗑️ Subscription deleted: ${subscription.id}`);

    await supabase
        .from('users_memberships')
        .update({
            status: 'canceled',
            expire_date: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

    console.log(`✅ Subscription marked as canceled: ${subscription.id}`);
}

/**
 * account.updated
 * 
 * Se dispara cuando cambia el estado de una cuenta Connect.
 * Actualiza is_active cuando el creator completa onboarding.
 */
async function handleAccountUpdated(account: Stripe.Account) {
    const supabase = await createClient();

    console.log(
        `🔧 Account updated: ${account.id} - Charges: ${account.charges_enabled}, Payouts: ${account.payouts_enabled}`
    );

    const isActive = account.charges_enabled && account.payouts_enabled;

    await supabase
        .from('connected_stripe_accounts')
        .update({ is_active: isActive })
        .eq('stripe_account_id', account.id);

    console.log(`✅ Connect account updated: ${account.id} - Active: ${isActive}`);
}

/**
 * charge.refunded
 * 
 * Se dispara cuando se procesa un reembolso.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
    const supabase = await createClient();

    console.log(`💸 Charge refunded: ${charge.id} - Amount: ${charge.amount_refunded}`);

    // Verificar idempotencia
    const refundId = charge.refunds?.data[0]?.id;
    if (!refundId) return;

    const { data: existingRefund } = await supabase
        .from('payments')
        .select('id')
        .eq('txn_stripe_id', refundId)
        .single();

    if (existingRefund) {
        console.log(`ℹ️ Refund already processed: ${refundId}`);
        return;
    }

    // Registrar reembolso
    const { data: originalPayment } = await supabase
        .from('payments')
        .select('user_id')
        .eq('txn_stripe_id', charge.id)
        .single();

    if (originalPayment) {
        await recordPayment({
            userId: originalPayment.user_id,
            amount: charge.amount_refunded,
            txnType: 'refund',
            txnStripeId: refundId,
            status: 'completed',
            direction: 'out',
        });
    }

    console.log(`✅ Refund recorded: ${refundId}`);
}

/**
 * payment_intent.payment_failed
 * 
 * Se dispara cuando falla un intento de pago.
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log(`❌ Payment failed: ${paymentIntent.id} - ${paymentIntent.last_payment_error?.message}`);

    // TODO: Notificar al usuario del fallo
    // TODO: Si es videollamada, cancelar booking pendiente
}
