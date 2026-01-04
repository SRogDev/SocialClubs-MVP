# Stripe Integration - Edge Cases & Future Implementation

Este documento lista todos los edge cases, limitaciones, y funcionalidades futuras identificadas durante la implementación de Stripe en SocialClubs.

## 🚧 Pospuesto para Implementación Futura

### 1. Sistema de Escrow para Videollamadas

**Problema**: Actualmente los fondos se transfieren inmediatamente al creator al completar el checkout. No hay mecanismo para retener fondos hasta que se complete la videollamada.

**Solución Futura**:

- Agregar campos a tabla `payments`:
  - `hold_status` ENUM ('held', 'released', 'refunded')
  - `hold_until` TIMESTAMP (fecha/hora de release)
  - `hold_reason` TEXT (ej: "videocall_pending")
- Usar `transfer_data.amount` en PaymentIntent en lugar de transferencia inmediata
- Crear evento trigger en tabla `users_agendas` que detecte cuando `status='completed'`
- API endpoint `POST /api/stripe/release-escrow` que:
  - Verifica que videollamada fue completada
  - Crea transfer manual a cuenta Connect del creator
  - Actualiza `hold_status='released'`
- Política de release automático tras X horas sin disputa

**Campos DB Requeridos**:

```sql
ALTER TABLE payments
ADD COLUMN hold_status TEXT CHECK (hold_status IN ('held', 'released', 'refunded')),
ADD COLUMN hold_until TIMESTAMPTZ,
ADD COLUMN hold_reason TEXT;
```

**Archivos a Crear**:

- `app/api/stripe/escrow/release/route.ts`
- `services/escrowService.ts`
- Trigger en Supabase: `ON UPDATE users_agendas WHEN status='completed'`

---

### 2. Política de Reembolsos Automáticos

**Problema**: No hay lógica implementada para reembolsos al cancelar videollamadas.

**Solución Futura**:

- Definir política de cancelación:
  - **24+ horas antes**: Reembolso 100%
  - **12-24 horas antes**: Reembolso 50%
  - **<12 horas**: Sin reembolso
- Implementar en `bookingService.cancelBooking()`:
  - Calcular ventana de cancelación
  - Llamar `stripe.refunds.create()` si aplica
  - Actualizar `payments` con refund transaction
- Webhook `charge.refunded` ya está implementado, solo falta trigger

**Archivos a Modificar**:

- `services/bookingService.ts` - Agregar lógica de refund
- `app/api/bookings/cancel/route.ts` - Validar ventana

**Consideraciones**:

- ¿Cobrar fee de cancelación tardía?
- ¿Permitir que creator configure su propia política?
- ¿Notificar via email antes de deadline de cancelación?

---

### 3. Partial Refunds y Dispute Handling

**Problema**: Solo se maneja refund completo. No hay sistema para:

- Reembolsos parciales
- Disputas/chargebacks de usuarios
- Resolución de conflictos entre creator y usuario

**Solución Futura**:

- Admin panel para revisar disputas
- API `POST /api/stripe/refunds/partial` con validación de monto
- Webhook `charge.dispute.created` para alertar admins
- Sistema de tickets integrado con Stripe disputes

**Edge Cases**:

- Usuario disputa pago DESPUÉS de videollamada completada
- Creator no aparece a videollamada pero usuario no reporta
- Videollamada se corta por problemas técnicos (¿quién paga?)

---

### 4. Retry Logic para Failed Payments

**Problema**: Cuando falla renovación de suscripción (`invoice.payment_failed`), solo se marca como `past_due`. No hay retry automático ni notificación.

**Solución Futura**:

- Configurar Stripe Smart Retries en dashboard
- Implementar email notifications:
  - Primer fallo: "Actualiza tu método de pago"
  - Segundo fallo: "Tu suscripción será cancelada en 3 días"
  - Tercer fallo: Cancelación automática
- API endpoint para actualizar método de pago desde app
- Grace period configurable (7-14 días antes de cancelar acceso)

**Archivos a Crear**:

- Email template: `components/emails/PaymentFailedEmail.tsx`
- Cron job: Verificar subscriptions en `past_due` > 7 días y cancelar

---

### 5. Timezone Handling en Cron Jobs

**Problema Detectado**: Las citas tienen timezone del creator, pero cron jobs corren en UTC. Podría haber desincronización al verificar citas vencidas o liberar escrow.

**Solución**:

- SIEMPRE convertir a UTC antes de comparaciones en cron
- Almacenar timezone en `users_agendas.creator_timezone`
- Usar librería `date-fns-tz` para conversiones seguras
- Testing exhaustivo con múltiples timezones

**Edge Cases**:

- Creator en PST agenda cita para "mañana 9am"
- Cron corre a medianoche UTC
- ¿Cuándo se considera "pasada" la cita?

---

### 6. Stripe Connect Limits & Restrictions

**No Implementado**: Validaciones de límites de Stripe Connect.

**Limitaciones Conocidas**:

- Express accounts requieren país soportado
- Algunos países tienen restricciones de payout
- Límites de procesamiento para cuentas nuevas
- Requisitos de verificación KYC

**Solución Futura**:

- Validar país del creator antes de crear cuenta
- Mostrar requirements pendientes de Stripe en dashboard
- Handle webhook `account.requirements.updated`
- Documentar países soportados en FAQ

---

### 7. Subscription Upgrades/Downgrades

**No Implementado**: Solo se puede suscribir o cancelar. No hay:

- Cambio de plan (upgrade/downgrade)
- Proration de pagos
- Billing cycle alignment

**Solución Futura**:

- API `POST /api/stripe/subscriptions/change-plan`
- Usar `stripe.subscriptions.update()` con proration
- Mostrar preview de cobro/crédito antes de confirmar
- UI en Customer Portal

---

### 8. Idempotency en Webhooks Duplicados

**Implementado Parcialmente**: Se usa `txn_stripe_id` para evitar duplicados en `payments`, pero no en todas las operaciones.

**Edge Cases No Cubiertos**:

- Webhook `invoice.paid` llega 2 veces → ¿Se extiende expire_date doble?
- Webhook `checkout.session.completed` reintenta → ¿Se crea booking duplicado?

**Solución Mejorada**:

- Crear tabla `webhook_events_processed`:

  ```sql
  CREATE TABLE webhook_events_processed (
    event_id TEXT PRIMARY KEY,
    event_type TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- Verificar `event_id` antes de procesar cualquier webhook
- Logging exhaustivo de retries

---

### 9. Multi-Currency Support

**No Implementado**: Todo está hardcoded en USD.

**Consideraciones**:

- Stripe soporta 135+ monedas
- Creators en diferentes países quieren cobrar en su moneda local
- Conversión de tasas y comisiones

**Solución Futura**:

- Agregar `currency` a `memberships` y `appointments`
- Configurar Connect accounts con moneda por defecto
- Mostrar precios en moneda del viewer (con conversión aproximada)

---

### 10. Invoice Generation & Tax Compliance

**No Implementado**: No se generan invoices descargables para usuarios.

**Stripe Billing ya genera invoices**, pero no están integrados en la app.

**Solución Futura**:

- Página `/profile/invoices` que muestre histórico
- Fetch `stripe.invoices.list()` para customer
- Botón "Descargar PDF" usando `invoice.invoice_pdf`
- Tax compliance: Agregar tax_id collection en Customer Portal

---

### 11. Rate Limiting en Webhook Endpoint

**Decisión de Diseño**: NO se aplicó rate limiting a `/api/webhooks/stripe` porque:

- Stripe controla su propio retry logic
- Rate limiting podría causar pérdida de eventos legítimos
- Ya hay verificación de firma como seguridad

**Alternativa Implementada**:

- Logging exhaustivo de todos los eventos
- Operaciones idempotentes
- Retorno 200 en errores no recuperables para evitar retry infinito

**Edge Case Potencial**:

- Ataque DDoS al webhook endpoint
- Solución: Cloudflare/Vercel DDoS protection + Webhook signing validation

---

### 12. Sandbox/Test Mode Separation

**No Implementado**: No hay UI para distinguir entorno test vs production.

**Problema**:

- Developers podrían usar test keys en producción accidentalmente
- Users podrían confundirse con pagos de test

**Solución**:

- Banner en dashboard cuando `STRIPE_SECRET_KEY` empieza con `sk_test_`
- Environment indicator en `.env.example`
- Cypress tests deben usar Stripe test fixtures

---

### 13. Failed Account Link Onboarding

**Edge Case**: Creator empieza onboarding pero no completa → AccountLink expira.

**Solución Actual**: `refresh_url` apunta a misma API route, genera nuevo link.

**Edge Case No Manejado**:

- Creator abandona onboarding múltiples veces
- ¿Después de cuántos intentos se bloquea?
- ¿Email de recordatorio?

---

### 14. Subscription Pause/Resume

**No Implementado**: Stripe soporta pausar subscriptions, pero no hay UI.

**Use Case**:

- Usuario quiere pausar por vacaciones
- Creator ofrece "pause sin cargo por 1 mes"

**Solución Futura**:

- `stripe.subscriptions.update({ pause_collection: { behavior: 'keep_as_draft' } })`
- UI en Customer Portal

---

### 15. Commission Fee Adjustments

**Hardcoded**: 10% fee en `lib/stripe.ts`.

**Problema**: No se puede ajustar por creator o tipo de transacción.

**Solución Futura**:

- Tabla `creator_commission_overrides`:

  ```sql
  CREATE TABLE creator_commission_overrides (
    user_id UUID REFERENCES users(id),
    commission_percent NUMERIC DEFAULT 10.0,
    applies_to TEXT[] -- ['subscriptions', 'videocalls']
  );
  ```

- Lógica dinámica en `calculatePlatformFee()`

---

### 16. Payout Scheduling & Manual Payouts

**No Implementado**: Creators no pueden:

- Solicitar retiro manual (payout)
- Configurar schedule de payouts automáticos
- Ver próximo payout date

**Solución Futura**:

- API `POST /api/stripe/payouts/request` que:
  - Valida `available_balance > minimum`
  - Crea `stripe.payouts.create()`
  - Registra en `payments` con `txn_type='payout'`
- Componente `PayoutRequestForm` en dashboard monetización
- Configurar `payout_schedule` en Connect account creation

---

### 17. Chargeback Handling Post-Release

**Edge Case Crítico**: Usuario hace chargeback DESPUÉS de que escrow fue liberado al creator.

**Problema**:

- Creator ya recibió el dinero
- Stripe debita de balance de plataforma
- ¿Quién asume la pérdida?

**Solución Futura**:

- Reserve fund: Plataforma retiene X% extra en escrow
- Webhook `charge.dispute.created`:
  - Pausar futuros payouts del creator hasta resolver
  - Crear ticket de soporte automático
- Política clara en ToS

---

### 18. Grace Period para Subscriptions Canceladas

**No Implementado**: Cuando usuario cancela, pierde acceso inmediato.

**Comportamiento Deseado**: Mantener acceso hasta fin del periodo pagado.

**Solución**:

- En `handleSubscriptionDeleted()`, usar `subscription.current_period_end`
- No cambiar status a `canceled` hasta esa fecha
- Cron job que verifica `expire_date < NOW()` y actualiza status

---

### 19. Connect Account Deactivation

**No Manejado**: ¿Qué pasa si Stripe desactiva cuenta Connect por ToS violation?

**Webhook**: `account.updated` con `charges_enabled=false`.

**Solución Futura**:

- Notificar creator via email urgente
- Pausar todas las subscriptions activas del club
- Ofrecer reembolsos automáticos a usuarios
- Dashboard admin para revisar casos

---

### 20. Testing Local con Stripe CLI

**Setup Requerido**:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks a localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Obtener webhook signing secret
# Copiar a .env.local como STRIPE_WEBHOOK_SECRET
```

**Fixtures para Testing**:

```bash
# Trigger test webhooks
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.deleted
```

**Archivos de Test a Crear**:

- `tests/integration/stripe-webhooks.test.ts`
- `tests/e2e/checkout-flow.spec.ts`
- Mock Stripe responses para unit tests

---

## 📝 Notas de Implementación

### Migrations Pendientes

Correr migración SQL para `stripe_customer_id`:

```bash
supabase migration up
# o desde Supabase Dashboard > SQL Editor
```

### Environment Variables

Agregar a `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Stripe Dashboard Configuration

1. **Webhooks**: Agregar endpoint `https://tudominio.com/api/webhooks/stripe`
2. **Events a suscribir**:
   - checkout.session.completed
   - invoice.paid
   - invoice.payment_failed
   - customer.subscription.updated
   - customer.subscription.deleted
   - account.updated
   - charge.refunded
   - payment_intent.payment_failed

3. **Connect Settings**:
   - Branding: Logo de SocialClubs
   - Statement descriptor: "SOCIALCLUBS"
   - Support email

---

## 🐛 Known Issues

1. **Membership table missing `stripe_price_id`**: Agregar columna antes de crear planes
2. **Booking table missing `stripe_subscription_id`** en users_memberships: Agregar para trackear subscriptions
3. **No email notifications implemented**: Webhooks están listos pero falta enviar emails

---

## 📚 Referencias

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Next.js + Stripe Guide](https://vercel.com/guides/getting-started-with-nextjs-typescript-stripe)

---

**Última actualización**: 2026-01-04  
**Mantenido por**: SocialClubs Dev Team
