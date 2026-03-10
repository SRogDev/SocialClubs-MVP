-- =============================================================================
-- MIGRATION: Idempotencia de Webhooks de Stripe
-- Fecha: 2026-02-24
-- =============================================================================
--
-- POR QUÉ ESTA MIGRACIÓN:
--
-- Documentado en docs/stripe-edge-cases.md sección 8 "Idempotency en Webhooks Duplicados":
--
-- Stripe garantiza entrega "at least once", lo que significa que un mismo evento
-- PUEDE llegar múltiples veces al endpoint `/api/webhooks/stripe/route.ts`.
-- Esto ocurre cuando:
--   · Stripe no recibe un HTTP 200 en tiempo (timeout en Edge Functions de Supabase)
--   · El servidor reinicia mientras procesa el webhook
--   · Deploy en Vercel que interrumpe una request en vuelo
--
-- Sin esta tabla, los webhooks duplicados producen efectos muy graves:
--
--   · `checkout.session.completed` × 2  → 2 bookings creados para la misma videollamada
--   · `invoice.paid` × 2               → membership extendida el doble de tiempo
--   · `charge.refunded` × 2            → intento de refund sobre un charge ya reembolsado
--                                         (Stripe lo rechaza, pero genera errores en logs)
--   · `customer.subscription.deleted` × 2 → usuario pierde acceso dos veces (race condition)
--
-- Actualmente en el código: se usa `txn_stripe_id` en la tabla `payments` para
-- evitar duplicados de transacciones, pero esto NO cubre todos los handlers.
-- Por ejemplo, la creación de bookings en `checkout.session.completed` NO verifica
-- duplicados — si llega dos veces, crea dos bookings.
--
-- SOLUCIÓN: tabla `webhook_events_processed`
-- Antes de procesar cualquier evento, se hace un INSERT con el event_id.
-- Si ya existe (constraint UNIQUE), el INSERT falla y se retorna 200 sin procesar.
-- Esto es el patrón estándar recomendado por Stripe en su documentación.
--
-- IMPLEMENTACIÓN EN CÓDIGO:
-- En `app/api/webhooks/stripe/route.ts`, al inicio del handler, añadir:
--
--   const { error: dupError } = await supabase
--     .from('webhook_events_processed')
--     .insert({ event_id: event.id, event_type: event.type })
--   if (dupError?.code === '23505') {
--     // Ya procesado — retornar 200 sin hacer nada
--     return NextResponse.json({ received: true, duplicate: true })
--   }
--
-- =============================================================================


CREATE TABLE IF NOT EXISTS public.webhook_events_processed (
    -- event_id es el ID único que Stripe asigna a cada evento (evt_xxx)
    -- Es la PRIMARY KEY — garantiza idempotencia a nivel de BD
    event_id     TEXT        PRIMARY KEY,

    -- Tipo de evento para facilitar debugging y monitoreo
    -- Ej: 'checkout.session.completed', 'invoice.paid', etc.
    event_type   TEXT        NOT NULL,

    -- Timestamp de cuándo lo procesamos (para auditoría y limpieza periódica)
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para la query de limpieza periódica:
-- "eliminar eventos procesados hace más de 30 días" (no necesitamos retenerlos para siempre)
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
    ON public.webhook_events_processed(processed_at);

COMMENT ON TABLE  public.webhook_events_processed            IS 'Registro de eventos de Stripe ya procesados. Previene procesamiento duplicado cuando Stripe reintenta el webhook.';
COMMENT ON COLUMN public.webhook_events_processed.event_id   IS 'ID único del evento Stripe (evt_xxx). PK que garantiza idempotencia.';
COMMENT ON COLUMN public.webhook_events_processed.event_type IS 'Tipo de evento (checkout.session.completed, invoice.paid, etc.) para debugging.';


-- =============================================================================
-- RLS: webhook_events_processed
-- =============================================================================
--
-- Esta tabla SOLO es accedida por el servidor (service role en API routes).
-- Ningún usuario de la app debe poder leerla ni escribirla directamente.
-- Habilitamos RLS y dejamos TODAS las policies vacías → acceso solo por service_role.

ALTER TABLE public.webhook_events_processed ENABLE ROW LEVEL SECURITY;

-- Sin policies = ningún usuario con JWT puede acceder.
-- El servidor usa `createClient()` con service_role_key que bypasea RLS.
-- Esto es intencional — es una tabla de infraestructura interna.


-- =============================================================================
-- LIMPIEZA AUTOMÁTICA (opcional, comentado — activar si se necesita)
-- =============================================================================
--
-- Los eventos de Stripe más viejos de 30 días ya no pueden ser reclamados,
-- así que mantenerlos más tiempo no aporta valor y ocupa espacio.
-- Esta función puede ser llamada desde un cron job mensual.
--
-- CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM public.webhook_events_processed
--     WHERE processed_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- Para activar el cron en Supabase (pg_cron):
-- SELECT cron.schedule(
--     'cleanup-webhook-events',
--     '0 3 1 * *',  -- 3am el día 1 de cada mes
--     'SELECT cleanup_old_webhook_events()'
-- );
