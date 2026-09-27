import type Stripe from 'stripe';

import { stripe, calculatePlatformFee, PLATFORM_FEE_PERCENT, ANNUAL_BILLING_MONTHS } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// STRIPE CONNECT - Creator Account Management
// ============================================================================

/**
 * Crea una cuenta Stripe Connect Express para un creator
 * 
 * @param userId - ID del usuario creator
 * @param email - Email del creator
 * @returns Account ID de Stripe
 */
export async function createConnectAccount(
    userId: string,
    email: string
): Promise<string> {
    const supabase = await createClient();

    // Verificar si ya tiene cuenta Connect
    const { data: existing } = await supabase
        .from('connected_stripe_accounts')
        .select('stripe_account_id')
        .eq('user_id', userId)
        .single();

    if (existing?.stripe_account_id) {
        return existing.stripe_account_id;
    }

    // Crear nueva cuenta Express
    const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        business_type: 'individual',
    });

    // Guardar en base de datos
    await supabase.from('connected_stripe_accounts').insert({
        user_id: userId,
        stripe_account_id: account.id,
        is_active: false, // Se activa cuando completa onboarding
    });

    return account.id;
}

/**
 * Genera un AccountLink para onboarding de Stripe Connect
 * 
 * @param accountId - ID de la cuenta Connect
 * @param refreshUrl - URL de retorno si hay error
 * @param returnUrl - URL de retorno al completar
 * @returns URL del AccountLink para redirigir al creator
 */
export async function createConnectAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
): Promise<string> {
    const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
    });

    return accountLink.url;
}

/**
 * Genera un login link al Express Dashboard
 * 
 * @param accountId - ID de la cuenta Connect
 * @returns URL del dashboard de Stripe
 */
export async function createDashboardLink(accountId: string): Promise<string> {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
}

/**
 * Verifica el estado de una cuenta Connect
 * 
 * @param accountId - ID de la cuenta Connect
 * @returns Estado de la cuenta y detalles
 */
export async function getConnectAccountStatus(accountId: string) {
    const account = await stripe.accounts.retrieve(accountId);

    return {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
    };
}

// ============================================================================
// CHECKOUT - Payment Sessions
// ============================================================================

/**
 * Crea una sesión de checkout para videollamada
 * 
 * @param params - Parámetros de la videollamada
 * @returns Checkout Session con URL
 */
export async function createBookingCheckoutSession(params: {
    appointmentId: number;
    date: string;
    userId: string;
    clubId: string;
    price: number;
    duration: number;
    connectedAccountId: string;
}): Promise<Stripe.Checkout.Session> {
    const supabase = await createClient();

    // Obtener o crear Stripe Customer
    const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id, email')
        .eq('id', params.userId)
        .single();

    let customerId = user?.stripe_customer_id;

    if (!customerId && user?.email) {
        const customer = await stripe.customers.create({
            email: user.email,
            metadata: { user_id: params.userId },
        });
        customerId = customer.id;

        // Guardar customer ID
        await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', params.userId);
    }

    // Calcular comisión de plataforma (10%)
    const platformFee = calculatePlatformFee(params.price);

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Videollamada - ${params.date}`,
                        description: `Consulta de ${params.duration} minutos`,
                    },
                    unit_amount: params.price,
                },
                quantity: 1,
            },
        ],
        payment_intent_data: {
            application_fee_amount: platformFee,
            transfer_data: {
                destination: params.connectedAccountId,
            },
            metadata: {
                appointment_id: params.appointmentId.toString(),
                user_id: params.userId,
                club_id: params.clubId,
                date: params.date,
                type: 'videocall',
            },
        },
        metadata: {
            appointment_id: params.appointmentId.toString(),
            user_id: params.userId,
            club_id: params.clubId,
            date: params.date,
            type: 'videocall',
        },
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/clubs/${params.clubId}`,
    });

    return session;
}

/**
 * Crea una sesión de checkout para suscripción
 * 
 * @param params - Parámetros de la suscripción
 * @returns Checkout Session con URL
 */
export async function createSubscriptionCheckoutSession(params: {
    userId: string;
    clubId: string;
    membershipId: string;
    stripePriceId: string;
    connectedAccountId: string;
}): Promise<Stripe.Checkout.Session> {
    const supabase = await createClient();

    // Obtener o crear Stripe Customer
    const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id, email')
        .eq('id', params.userId)
        .single();

    let customerId = user?.stripe_customer_id;

    if (!customerId && user?.email) {
        const customer = await stripe.customers.create({
            email: user.email,
            metadata: { user_id: params.userId },
        });
        customerId = customer.id;

        await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', params.userId);
    }

    // Crear sesión de checkout para suscripción
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [
            {
                price: params.stripePriceId,
                quantity: 1,
            },
        ],
        subscription_data: {
            application_fee_percent: PLATFORM_FEE_PERCENT,
            transfer_data: {
                destination: params.connectedAccountId,
            },
            metadata: {
                user_id: params.userId,
                club_id: params.clubId,
                membership_id: params.membershipId,
            },
        },
        metadata: {
            user_id: params.userId,
            club_id: params.clubId,
            membership_id: params.membershipId,
            type: 'subscription',
        },
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/clubs/${params.clubId}?subscribed=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/clubs/${params.clubId}`,
    });

    return session;
}

// ============================================================================
// SUBSCRIPTIONS - Product & Price Management
// ============================================================================

/**
 * Crea un producto con precio mensual Y anual en Stripe para una membership.
 * El precio anual equivale a 10 meses (2 meses gratis, ~17% descuento).
 *
 * @param params - Parámetros del plan de suscripción
 * @returns { monthlyPriceId, yearlyPriceId }
 */
export async function createSubscriptionPlan(params: {
    connectedAccountId: string;
    clubId: string;
    membershipId: string;
    name: string;
    description: string;
    price: number; // En centavos (mensual)
}): Promise<{ monthlyPriceId: string; yearlyPriceId: string }> {
    const stripeAccount = { stripeAccount: params.connectedAccountId };
    const meta = { club_id: params.clubId, membership_id: params.membershipId };

    // Crear producto
    const product = await stripe.products.create(
        {
            name: params.name,
            description: params.description,
            metadata: meta,
        },
        stripeAccount
    );

    // Precio mensual
    const monthlyPrice = await stripe.prices.create(
        {
            product: product.id,
            unit_amount: params.price,
            currency: 'usd',
            recurring: { interval: 'month' },
            metadata: meta,
        },
        stripeAccount
    );

    // Precio anual: ANNUAL_BILLING_MONTHS meses (2 meses gratis)
    const yearlyPrice = await stripe.prices.create(
        {
            product: product.id,
            unit_amount: params.price * ANNUAL_BILLING_MONTHS,
            currency: 'usd',
            recurring: { interval: 'year' },
            metadata: meta,
        },
        stripeAccount
    );

    return { monthlyPriceId: monthlyPrice.id, yearlyPriceId: yearlyPrice.id };
}

// ============================================================================
// CUSTOMER PORTAL - Self-service Management
// ============================================================================

/**
 * Crea una sesión del Customer Portal para gestionar suscripciones
 * 
 * @param customerId - Stripe Customer ID
 * @param returnUrl - URL de retorno
 * @returns URL del portal
 */
export async function createPortalSession(
    customerId: string,
    returnUrl: string
): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });

    return session.url;
}

// ============================================================================
// PAYMENTS & BALANCES - Tracking
// ============================================================================

/**
 * Obtiene el balance y earnings de un club creator
 * 
 * @param userId - ID del creator
 * @returns Balance detallado
 */
export async function getCreatorEarnings(userId: string) {
    const supabase = await createClient();

    // Obtener balance desde DB
    const { data: balance } = await supabase
        .from('club_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

    // Obtener transacciones recientes
    const { data: transactions } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    // Obtener cuenta Connect para balance de Stripe
    const { data: connectAccount } = await supabase
        .from('connected_stripe_accounts')
        .select('stripe_account_id')
        .eq('user_id', userId)
        .single();

    let stripeBalance = null;
    if (connectAccount?.stripe_account_id) {
        stripeBalance = await stripe.balance.retrieve({
            stripeAccount: connectAccount.stripe_account_id,
        });
    }

    return {
        balance: balance || { total_earnings: 0, available_balance: 0 },
        transactions: transactions || [],
        stripeBalance,
    };
}

/**
 * Registra un pago en la base de datos
 * 
 * @param params - Datos del pago
 */
export async function recordPayment(params: {
    userId: string;
    amount: number;
    txnType: 'payment' | 'payout' | 'fee' | 'refund';
    txnStripeId: string;
    status: 'pending' | 'completed' | 'failed';
    direction: 'in' | 'out';
}) {
    const supabase = await createClient();

    const { data: payment, error } = await supabase
        .from('payments')
        .insert({
            user_id: params.userId,
            amount: params.amount,
            txn_type: params.txnType,
            txn_stripe_id: params.txnStripeId,
            status: params.status,
            direction: params.direction,
        })
        .select()
        .single();

    if (error) {
        console.error('Error recording payment:', error);
        throw error;
    }

    // Actualizar balance si es un ingreso completado
    if (params.direction === 'in' && params.status === 'completed') {
        await updateClubBalance(params.userId, params.amount);
    }

    return payment;
}

/**
 * Actualiza el balance de un club creator
 * 
 * @param userId - ID del creator
 * @param amount - Monto a agregar (puede ser negativo)
 */
async function updateClubBalance(userId: string, amount: number) {
    const supabase = await createClient();

    // Obtener balance actual
    const { data: balance } = await supabase
        .from('club_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (balance) {
        // Actualizar balance existente
        await supabase
            .from('club_balances')
            .update({
                total_earnings: balance.total_earnings + amount,
                available_balance: balance.available_balance + amount,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
    } else {
        // Crear balance nuevo
        await supabase.from('club_balances').insert({
            user_id: userId,
            total_earnings: amount,
            available_balance: amount,
        });
    }
}

// ============================================================================
// ESCROW — Booking Payments
// ============================================================================

/**
 * Libera el pago en escrow al creator (90%) después de que completa la videollamada.
 * La plataforma retiene el 10% como comisión.
 *
 * Flujo:
 *  1. La videollamada se marca como completada
 *  2. Se hace una transferencia del 90% al creator
 *  3. Se actualiza escrow_status = 'released' en users_agendas
 *
 * @param bookingId     - ID del booking en users_agendas
 * @param paymentIntentId - Stripe PaymentIntent ID capturado en checkout
 * @param connectedAccountId - Stripe account ID del creator
 * @param totalAmountCents - Monto total pagado (en centavos)
 */
export async function releaseEscrowToCreator(params: {
    bookingId: number
    paymentIntentId: string
    connectedAccountId: string
    totalAmountCents: number
    creatorUserId: string
}): Promise<void> {
    const supabase = await createClient()

    const platformFee = calculatePlatformFee(params.totalAmountCents)
    const creatorAmount = params.totalAmountCents - platformFee

    // Transfer 90% to the creator's connected account
    const transfer = await stripe.transfers.create({
        amount: creatorAmount,
        currency: 'usd',
        destination: params.connectedAccountId,
        source_transaction: params.paymentIntentId,
        metadata: {
            booking_id: params.bookingId.toString(),
            type: 'videocall_escrow_release',
        },
    })

    // Mark escrow as released in DB
    const now = new Date().toISOString()
    await supabase
        .from('users_agendas')
        .update({
            escrow_status: 'released',
            escrow_released_at: now,
        })
        .eq('id', params.bookingId)

    // Record the payout
    await recordPayment({
        userId: params.creatorUserId,
        amount: creatorAmount,
        txnType: 'payout',
        txnStripeId: transfer.id,
        status: 'completed',
        direction: 'out',
    })
}

/**
 * Reembolsa el 90% al usuario (no-show del creator o cancelación).
 * La plataforma retiene el 10% de comisión por el servicio.
 *
 * @param bookingId        - ID del booking
 * @param paymentIntentId  - Stripe PaymentIntent ID
 * @param totalAmountCents - Monto total pagado (en centavos)
 * @param userId           - ID del usuario que pagó
 */
export async function createBookingRefund(params: {
    bookingId: number
    paymentIntentId: string
    totalAmountCents: number
    userId: string
}): Promise<Stripe.Refund> {
    const supabase = await createClient()

    const platformFee = calculatePlatformFee(params.totalAmountCents)
    const refundAmount = params.totalAmountCents - platformFee // 90%

    const refund = await stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
            booking_id: params.bookingId.toString(),
            type: 'videocall_noshow_refund',
        },
    })

    // Update escrow status in DB
    await supabase
        .from('users_agendas')
        .update({
            escrow_status: 'refunded',
            refund_stripe_id: refund.id,
        })
        .eq('id', params.bookingId)

    // Record refund transaction
    await recordPayment({
        userId: params.userId,
        amount: refundAmount,
        txnType: 'refund',
        txnStripeId: refund.id,
        status: 'completed',
        direction: 'out',
    })

    return refund
}
