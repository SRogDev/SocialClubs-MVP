# Stripe Integration - Setup Guide

## 📋 Descripción General

Integración completa de Stripe para SocialClubs que incluye:

- **Stripe Connect Express**: Cuentas de pago para creators
- **Checkout de Videollamadas**: Pagos únicos con comisión de plataforma (10%)
- **Subscripciones Recurrentes**: Memberships mensuales a clubs
- **Customer Portal**: Auto-gestión de suscripciones
- **Webhook Handler**: Sincronización automática Stripe ↔ Supabase
- **Dashboard de Monetización**: Panel completo para creators

---

## 🚀 Setup Rápido

### 1. Instalar Dependencias

```bash
pnpm install
# stripe ya está instalado en package.json
```

### 2. Configurar Variables de Entorno

Agregar a `.env.local`:

```bash
# Stripe Keys (obtener desde https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Importante**: Usar **test keys** (`sk_test_`, `pk_test_`) para development.

### 3. Correr Migraciones de Base de Datos

```bash
# Aplicar migraciones SQL
supabase db push

# O manualmente desde Supabase Dashboard > SQL Editor:
# - supabase/migrations/20260104000001_add_stripe_customer_id.sql
# - supabase/migrations/20260104000002_add_stripe_subscription_fields.sql
```

### 4. Configurar Webhooks con Stripe CLI (Development)

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Autenticar
stripe login

# Forward webhooks a localhost
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Copiar el webhook signing secret que aparece y agregarlo a .env.local
# STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 5. Correr la Aplicación

```bash
pnpm dev
```

---

## 🔧 Configuración de Stripe Dashboard

### Connect Settings

1. Ir a: <https://dashboard.stripe.com/settings/connect>
2. **Branding**:
   - Upload logo de SocialClubs
   - Color primario: `#your-brand-color`
3. **Business Settings**:
   - Platform name: "SocialClubs"
   - Support email: <support@socialclubs.com>
   - Statement descriptor: "SOCIALCLUBS"

### Webhooks (Production)

1. Ir a: <https://dashboard.stripe.com/webhooks>
2. Agregar endpoint: `https://tudominio.com/api/webhooks/stripe`
3. Seleccionar eventos:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `account.updated`
   - ✅ `charge.refunded`
   - ✅ `payment_intent.payment_failed`
4. Copiar **Signing secret** a `.env` de producción

---

## 📐 Arquitectura

### Flujo de Videollamadas (Pago Único)

```
Usuario → Selecciona cita
    ↓
POST /api/stripe/checkout-booking
    ↓
Stripe Checkout Session (con comisión 10%)
    ↓
Usuario paga
    ↓
Webhook: checkout.session.completed
    ↓
bookingService.confirmBooking()
    ↓
Registro en payments + Actualización de balance
```

### Flujo de Suscripciones (Recurrente)

```
Creator → Crea plan de membership
    ↓
POST /api/stripe/subscriptions/create-plan
    ↓
Stripe Price + Product creados
    ↓
Usuario → Click "Suscribirse"
    ↓
POST /api/stripe/subscriptions/checkout
    ↓
Stripe Checkout Session (mode=subscription)
    ↓
Usuario suscribe
    ↓
Webhook: checkout.session.completed
    ↓
Crear users_memberships (status=active)
    ↓
Renovaciones mensuales automáticas (invoice.paid webhook)
```

### Flujo de Connect Onboarding

```
Creator → Dashboard Monetización
    ↓
Click "Conectar con Stripe"
    ↓
POST /api/stripe/connect/onboarding
    ↓
Stripe AccountLink generado
    ↓
Creator completa onboarding en Stripe
    ↓
Webhook: account.updated (charges_enabled=true)
    ↓
connected_stripe_accounts.is_active = true
```

---

## 🔌 API Routes Disponibles

### Connect

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/stripe/connect/onboarding` | POST | Crea cuenta Connect y genera AccountLink |
| `/api/stripe/connect/dashboard` | GET | Genera login link al Express Dashboard |
| `/api/stripe/connect/status` | GET | Obtiene estado de cuenta Connect |

### Checkout

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/stripe/checkout-booking` | POST | Crea sesión para videollamada |
| `/api/stripe/subscriptions/checkout` | POST | Crea sesión para suscripción |

### Subscriptions

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/stripe/subscriptions/create-plan` | POST | Crea Price/Product en Stripe |
| `/api/stripe/portal` | POST | Genera Customer Portal session |

### Earnings

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/stripe/earnings` | GET | Obtiene balance y transacciones |

### Webhooks

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/webhooks/stripe` | POST | Recibe eventos de Stripe |

---

## 🎣 Hooks SWR Disponibles

### `useAppointments(clubId)`

Fetches citas disponibles de un club.

```tsx
import { useAppointments } from '@/hooks/swr/useAppointments';

const { appointments, isLoading, mutate } = useAppointments(clubId);
```

### `useBookings(params)`

Fetches reservas de videollamadas.

```tsx
import { useBookings } from '@/hooks/swr/useBookings';

const { bookings, isLoading } = useBookings({ 
  user_id: userId,
  status: 'confirmed' 
});
```

### `useEarnings()`

Fetches ingresos y transacciones del creator.

```tsx
import { useEarnings } from '@/hooks/swr/useEarnings';

const { earnings, isLoading } = useEarnings();
// earnings.balance.total_earnings
// earnings.balance.available_balance
// earnings.transactions
```

### `useConnectStatus()`

Fetches estado de cuenta Connect.

```tsx
import { useConnectStatus } from '@/hooks/swr/useEarnings';

const { status, isLoading } = useConnectStatus();
// status.hasAccount
// status.isActive
```

---

## 🧪 Testing

### Trigger Webhooks Localmente

```bash
# Simular pago completado
stripe trigger checkout.session.completed

# Simular renovación de suscripción
stripe trigger invoice.paid

# Simular fallo de pago
stripe trigger invoice.payment_failed

# Simular cancelación
stripe trigger customer.subscription.deleted
```

### Test Cards

```
Éxito: 4242 4242 4242 4242
Fallo: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

### Unit Tests (TODO)

```bash
pnpm test tests/unit/stripeService.test.ts
```

---

## 📊 Dashboard de Monetización

Ruta: `/clubs/[id]/panel/monetization`

**Componentes**:

- `EarningsOverview` - Total earnings, balance disponible, pendiente
- `RevenueMetrics` - MRR, ARR, suscriptores activos, ARPU
- `TransactionHistory` - Tabla de transacciones
- `ConnectDashboardButton` - Link a Express Dashboard

**Server Component**: Fetcha datos directamente en server, no usa SWR.

---

## 🐛 Troubleshooting

### Webhook 401 Unauthorized

**Causa**: Signature verification failing.

**Solución**:

1. Verificar que `STRIPE_WEBHOOK_SECRET` sea correcto
2. En local: Usar secret de `stripe listen`
3. En producción: Copiar de Stripe Dashboard > Webhooks

### "Creator no tiene cuenta Connect"

**Causa**: Creator no completó onboarding.

**Solución**:

1. Ir a `/clubs/[id]/panel/monetization`
2. Click "Conectar con Stripe"
3. Completar todos los pasos en Stripe
4. Verificar `connected_stripe_accounts.is_active = true`

### Payments no se registran en DB

**Causa**: Webhook no llegó o falló.

**Solución**:

1. Verificar logs: `console.log` en webhook handler
2. Stripe Dashboard > Events > Ver delivery attempts
3. Revisar idempotencia: ¿`txn_stripe_id` ya existe?

### Balance disponible es 0

**Causa**: Stripe retiene fondos por X días (default 2-7 días).

**Solución**:

1. Revisar `stripeBalance.available` en `/api/stripe/earnings`
2. Configurar payout schedule en Stripe Connect settings
3. Esperar periodo de retención

---

## 📚 Recursos

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Edge Cases Document](./docs/stripe-edge-cases.md)

---

## ⚠️ Limitaciones Conocidas

Ver documento completo: [`docs/stripe-edge-cases.md`](./docs/stripe-edge-cases.md)

**Principales**:

1. **Escrow para videollamadas**: Fondos se transfieren inmediatamente (pospuesto)
2. **Refund policy**: No hay lógica automática de reembolsos
3. **Multi-currency**: Solo USD soportado actualmente
4. **Invoice downloads**: No integrados en app

---

## 🔐 Seguridad

- ✅ Webhook signature verification
- ✅ Rate limiting en API routes
- ✅ Idempotency en transacciones
- ✅ Ownership validation (creator solo ve sus datos)
- ✅ HTTPS requerido en producción

---

---

## ✅ Live-verification checklist (real money — run by Roger)

The Stripe integration was built and tested with **test keys only**. Before the first public launch, run this end-to-end verification with **live keys**. Do it once, carefully, with a real card you control.

### Preparation
1. In the Stripe Dashboard, switch to **Live mode** and copy: `sk_live_...`, `pk_live_...`.
2. Add the production webhook endpoint `https://<your-domain>/api/webhooks/stripe` in **Live mode** (Developers → Webhooks), selecting the same events listed above. Copy the live `whsec_...`.
3. Set the three live values as env vars in production (Vercel → Environment Variables). Redeploy.
4. Complete a **Connect onboarding** with a real creator account (can be your own) and confirm `charges_enabled = true` in the Dashboard.

### The $1 test
5. Create a **$1/month test membership plan** for a test club (`/clubs/[id]/panel/monetization`).
6. As a *different* user (or incognito), subscribe with a **real card**. Use a card you own.
7. Verify in the app: membership shows as **active**, member-only content unlocks.
8. Verify in Supabase: a row exists in `users_memberships` with `status = active`, and a row in `payments` with `status = completed`.
9. Verify in Stripe Dashboard (Live): the subscription exists, the invoice is paid, and the Connect transfer to the creator's account is visible (minus the 10% platform fee).
10. Open the **Customer Portal** from the app and **cancel** the subscription. Verify `users_memberships.status` flips to cancelled/inactive after the webhook arrives.
11. (Optional but recommended) Wait for the first renewal or simulate it: confirm `invoice.paid` extends the membership instead of creating a duplicate.
12. Delete the $1 test plan and refund the test charge from the Dashboard.

### What "done" looks like
- [ ] Real card charged $1, membership activated in app + DB
- [ ] Creator received the transfer (minus platform fee) in their Connect account
- [ ] Cancellation via portal reflected in app + DB
- [ ] No duplicate memberships on renewal
- [ ] Webhook deliveries all `200` in the Dashboard (no retries)

**Do not skip this.** Test mode does not verify Connect payouts, live webhook signing, or real card behavior.

**Última actualización**: 2026-10-06
**Versión**: 1.1.0
**Maintainer**: SocialClubs Dev Team
