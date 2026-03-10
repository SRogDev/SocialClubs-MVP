import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createBooking } from '@/services/bookingService';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function activateSubscription(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    _clubId: string,
    membershipId: string,
    stripeSubscriptionId: string,
    customerId: string
) {
    // Cancel any pre-existing subscription to this membership
    await supabase
        .from('users_memberships')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user', userId)
        .eq('membership', membershipId)
        .neq('status', 'cancelled');

    // Upsert active subscription
    const { error } = await supabase.from('users_memberships').upsert(
        {
            user: userId,
            membership: membershipId,
            status: 'active',
            stripe_subscription_id: stripeSubscriptionId,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
    );

    if (error) throw new Error(`Error activating subscription: ${error.message}`);

    // Persist stripe_customer_id if not already stored
    await supabase
        .from('users')
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .is('stripe_customer_id', null);

    console.log(`[Webhook] Subscription activated – user=${userId} membership=${membershipId}`);
}

async function cancelSubscription(
    supabase: Awaited<ReturnType<typeof createClient>>,
    stripeSubscriptionId: string
) {
    const { error } = await supabase
        .from('users_memberships')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeSubscriptionId);

    if (error) console.error('[Webhook] Error cancelling subscription:', error);
    else console.log(`[Webhook] Subscription ${stripeSubscriptionId} cancelled`);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
    supabase: Awaited<ReturnType<typeof createClient>>,
    session: Stripe.Checkout.Session
) {
    const { type, user_id, club_id, membership_id, appointment_id, date } =
        session.metadata ?? {};

    if (!user_id) {
        console.warn('[Webhook] checkout.session.completed: missing user_id');
        return;
    }

    if (type === 'subscription' && membership_id) {
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        await activateSubscription(
            supabase,
            user_id,
            club_id!,
            membership_id,
            subscriptionId,
            customerId
        );
    } else if (type === 'videocall' && appointment_id && date) {
        const paymentIntentId = session.payment_intent as string;

        // Check for existing pending booking
        const { data: existingBooking } = await supabase
            .from('users_agendas')
            .select('id')
            .eq('user_id', user_id)
            .eq('appointment_id', parseInt(appointment_id))
            .eq('date', date)
            .maybeSingle();

        if (existingBooking) {
            await supabase
                .from('users_agendas')
                .update({
                    status: 'confirmed',
                    payment_id: paymentIntentId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingBooking.id)
                .eq('status', 'pending');
        } else {
            await createBooking(
                { appointment_id: parseInt(appointment_id), date, user_timezone: 'UTC' },
                user_id,
                paymentIntentId
            );
        }

        console.log(`[Webhook] Booking confirmed – user=${user_id} appointment=${appointment_id}`);
    }
}

async function handleSubscriptionUpdated(
    supabase: Awaited<ReturnType<typeof createClient>>,
    subscription: Stripe.Subscription
) {
    const statusMap: Record<string, string> = {
        active: 'active',
        canceled: 'cancelled',
        past_due: 'past_due',
        unpaid: 'past_due',
        incomplete: 'pending',
        incomplete_expired: 'cancelled',
        trialing: 'active',
        paused: 'paused',
    };

    const newStatus = statusMap[subscription.status] ?? subscription.status;

    await supabase
        .from('users_memberships')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscription.id);

    console.log(`[Webhook] Subscription ${subscription.id} → ${newStatus}`);
}

async function handleConnectAccountUpdated(
    supabase: Awaited<ReturnType<typeof createClient>>,
    account: Stripe.Account
) {
    const isActive =
        account.charges_enabled && account.payouts_enabled && account.details_submitted;

    await supabase
        .from('connected_stripe_accounts')
        .update({
            is_active: isActive,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_account_id', account.id);

    console.log(`[Webhook] Connect account ${account.id} – active=${isActive}`);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
    // In Stripe SDK v20+ subscription lives under parent.subscription_details
    const parent = (invoice as any).parent;
    const sub = parent?.subscription_details?.subscription ?? (invoice as any).subscription;
    return typeof sub === 'string' ? sub : sub?.id;
}

async function handleInvoicePaid(
    supabase: Awaited<ReturnType<typeof createClient>>,
    invoice: Stripe.Invoice
) {
    const subscriptionId = getInvoiceSubscriptionId(invoice);
    if (!subscriptionId) return;

    await supabase
        .from('users_memberships')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
        .eq('status', 'past_due');

    console.log(`[Webhook] Invoice ${invoice.id} paid for subscription ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(
    supabase: Awaited<ReturnType<typeof createClient>>,
    invoice: Stripe.Invoice
) {
    const subscriptionId = getInvoiceSubscriptionId(invoice);
    if (!subscriptionId) return;

    await supabase
        .from('users_memberships')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId);

    console.log(`[Webhook] Invoice payment failed for subscription ${subscriptionId}`);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error('[Webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await createClient();

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await cancelSubscription(supabase, (event.data.object as Stripe.Subscription).id);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
                break;

            case 'account.updated':
                await handleConnectAccountUpdated(supabase, event.data.object as Stripe.Account);
                break;

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                console.log(`[Webhook] Charge ${charge.id} refunded – amount=${charge.amount_refunded}`);
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error(`[Webhook] Error processing ${event.type}:`, error);
        // Return 200 so Stripe does not keep retrying; the error is already logged
        return NextResponse.json({ received: true, processing_error: error.message });
    }
}
