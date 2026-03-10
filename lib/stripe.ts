import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

/**
 * Stripe SDK Singleton Instance
 * 
 * Inicializa el cliente de Stripe con la API secret key.
 * Configurado para TypeScript con strict mode.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
    appInfo: {
        name: 'SocialClubs',
        version: '1.0.0',
    },
});

/**
 * Platform Fee Percentage
 *
 * Comisión base que retiene SocialClubs. Se reduce según el volumen del creator:
 *   $0–$500 MRR   → 15%
 *   $500–$2K MRR  → 12%
 *   $2K–$10K MRR  → 10%
 *   +$10K MRR     → 7%
 *
 * Cubre: comisión de plataforma + fees de procesamiento de Stripe.
 */
export const PLATFORM_FEE_PERCENT = 15;

/** Precio mínimo permitido para suscripciones de pago (en centavos) */
export const MIN_SUBSCRIPTION_PRICE_CENTS = 500; // $5.00

/**
 * Meses que se cobran en una suscripción anual (2 meses gratis = ~17% descuento).
 * yearly_price = monthly_price * ANNUAL_BILLING_MONTHS
 */
export const ANNUAL_BILLING_MONTHS = 10;

/**
 * Calcula el monto de la comisión de plataforma
 *
 * @param amount - Monto total en centavos
 * @returns Monto de la comisión en centavos
 *
 * @example
 * calculatePlatformFee(2000) // returns 300 (15% of $20)
 */
export function calculatePlatformFee(amount: number): number {
    return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

/**
 * Webhook Secret Key
 * 
 * Usado para verificar la autenticidad de webhooks de Stripe.
 * Obtener desde Stripe Dashboard > Developers > Webhooks.
 */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!STRIPE_WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set. Webhooks will fail in production.');
}
