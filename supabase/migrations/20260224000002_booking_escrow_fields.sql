-- =============================================================================
-- MIGRATION: Sistema de Escrow y Reembolsos para Videollamadas (Bookings)
-- Fecha: 2026-02-24
-- =============================================================================
--
-- POR QUÉ ESTA MIGRACIÓN:
--
-- Problema actual (documentado en docs/stripe-edge-cases.md):
-- Cuando un usuario paga una videollamada, los fondos se transfieren INMEDIATAMENTE
-- a la cuenta Connect del creador vía `transfer_data` en el PaymentIntent.
-- Esto crea varios problemas graves:
--
--   1. Si el CREADOR NO ASISTE a la videollamada → el dinero ya fue transferido
--      y no hay forma de devolverlo automáticamente al usuario.
--
--   2. Si el USUARIO cancela con antelación → `bookingService.cancelBooking()`
--      tiene un TODO "Process refund via Stripe if applicable" sin implementar.
--
--   3. No existe trazabilidad del estado financiero de cada booking:
--      ¿fue reembolsado? ¿fue liberado al creador? ¿hay una disputa abierta?
--
-- SOLUCIÓN — Flujo escrow:
--
--   PAGO          → fondos retenidos en plataforma (escrow_status = 'held')
--                   · Se usa `capture_method: 'automatic'` SIN `transfer_data`
--                     en el PaymentIntent inicial, o se usa `transfer_group`
--                     para controlar el transfer manualmente.
--                   · El payment_intent_id se guarda en users_agendas para
--                     poder referenciarlo al hacer refund o release.
--
--   COMPLETADA    → videollamada ocurrió, se libera al creador (escrow_status = 'released')
--                   · API route: POST /api/bookings/[id]/complete
--                   · 90% al creador (transfer a su cuenta Connect)
--                   · 10% queda en la plataforma (ya cobrado como application_fee)
--
--   NO-SHOW       → creador no asistió, se reembolsa al usuario (escrow_status = 'refunded')
--                   · API route: POST /api/bookings/[id]/no-show
--                   · 90% devuelto al usuario (refund de Stripe)
--                   · 10% queda en la plataforma (fee por gestión del incidente)
--
--   CANCELACIÓN   → usuario cancela antes de la videollamada
--                   · API route: POST /api/bookings/[id]/refund
--                   · Si cancela con tiempo (24h+): 90% al usuario, 10% creador
--                   · La política exacta se define en bookingService.ts
--
-- CAMPOS AÑADIDOS A users_agendas:
--   · payment_intent_id  — ID del PaymentIntent de Stripe para operar refunds/transfers
--   · escrow_status      — estado financiero del booking
--   · escrow_released_at — timestamp de cuando se liberaron fondos al creador
--   · refund_stripe_id   — ID del Refund de Stripe para trazabilidad
--   · creator_no_show    — flag: el creador no se presentó (activa reembolso automático)
--
-- CAMPOS AÑADIDOS A payments:
--   · hold_status  — estado del hold financiero ('held' | 'released' | 'refunded')
--   · hold_until   — hasta cuándo retener los fondos (ventana de disputa)
--   · hold_reason  — motivo del hold ('videocall_pending', 'dispute_open', etc.)
--   · booking_id   — referencia al booking asociado para trazabilidad cruzada
--
-- =============================================================================


-- =============================================================================
-- PARTE 1: Campos de escrow en users_agendas (bookings de videollamadas)
-- =============================================================================

-- payment_intent_id: guardamos el ID del PaymentIntent de Stripe.
-- Sin esto, no podemos llamar a stripe.refunds.create() ni a stripe.transfers.create()
-- porque no sabemos qué pago está asociado a este booking.
-- (Actualmente se guarda payment_id con el checkout session ID, pero necesitamos
-- el PaymentIntent ID para operar sobre el cargo directamente.)
ALTER TABLE public.users_agendas
    ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- escrow_status: estado financiero del booking.
-- 'pending'   = pago no realizado aún (booking sin confirmar)
-- 'held'      = pago recibido, fondos retenidos por la plataforma (escrow activo)
-- 'released'  = videollamada completada, fondos transferidos al creador (90%)
-- 'refunded'  = fondos devueltos al usuario (90%) por cancelación o no-show del creador
-- NULL        = bookings pre-migración sin gestión de escrow
ALTER TABLE public.users_agendas
    ADD COLUMN IF NOT EXISTS escrow_status TEXT
    CHECK (escrow_status IN ('pending', 'held', 'released', 'refunded'));

-- escrow_released_at: timestamp de cuando se ejecutó el transfer al creador.
-- Útil para auditoría y para mostrar en el panel de ganancias del creador.
ALTER TABLE public.users_agendas
    ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ;

-- refund_stripe_id: ID del objeto Refund de Stripe (re_xxx).
-- Necesario para:
--   · Verificar en el webhook charge.refunded que el refund corresponde a este booking
--   · Mostrar al usuario el comprobante de reembolso
--   · Evitar doble refund (si ya existe este campo, no se procesa otro)
ALTER TABLE public.users_agendas
    ADD COLUMN IF NOT EXISTS refund_stripe_id TEXT;

-- creator_no_show: flag que marca que el creador no apareció a la videollamada.
-- Lo setea el cron job que verifica bookings vencidos SIN room creada (call_room_created = false)
-- pasada la hora de fin. También puede setearlo el usuario manualmente vía API.
-- Cuando es TRUE, el sistema debe disparar el reembolso automático del 90%.
ALTER TABLE public.users_agendas
    ADD COLUMN IF NOT EXISTS creator_no_show BOOLEAN DEFAULT FALSE NOT NULL;

-- Índice para que el cron job de no-show detection sea eficiente.
-- Query frecuente: "bookings confirmados donde pasó la hora de fin y no hubo room"
CREATE INDEX IF NOT EXISTS idx_users_agendas_escrow_status
    ON public.users_agendas(escrow_status)
    WHERE escrow_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_agendas_payment_intent
    ON public.users_agendas(payment_intent_id)
    WHERE payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_agendas_no_show
    ON public.users_agendas(creator_no_show)
    WHERE creator_no_show = TRUE;

COMMENT ON COLUMN public.users_agendas.payment_intent_id  IS 'Stripe PaymentIntent ID (pi_xxx). Necesario para refunds y transfers manuales en el flujo de escrow.';
COMMENT ON COLUMN public.users_agendas.escrow_status      IS 'Estado financiero: pending→held (pago recibido)→released (completada) o refunded (cancelada/no-show).';
COMMENT ON COLUMN public.users_agendas.escrow_released_at IS 'Timestamp cuando se ejecutó el transfer del 90% al creador. NULL si no se ha liberado.';
COMMENT ON COLUMN public.users_agendas.refund_stripe_id   IS 'Stripe Refund ID (re_xxx). Si existe, impide un segundo refund sobre el mismo booking.';
COMMENT ON COLUMN public.users_agendas.creator_no_show    IS 'TRUE si el creador no asistió a la videollamada. Dispara reembolso automático del 90% al usuario.';


-- =============================================================================
-- PARTE 2: Campos de hold/escrow en tabla payments
-- =============================================================================
-- (Documentado en docs/stripe-edge-cases.md sección 1 "Campos DB Requeridos")
--
-- La tabla `payments` lleva el registro contable de cada transacción.
-- Añadimos los campos de hold para poder rastrear el ciclo de vida financiero
-- completo: cobrado → retenido → liberado/devuelto.

-- hold_status: estado del hold financiero.
-- 'held'     = fondos cobrados pero aún no transferidos ni devueltos
-- 'released' = fondos transferidos al creator (escrow completado)
-- 'refunded' = fondos devueltos al usuario (parcial o total)
-- NULL       = pagos que no son videollamadas (suscripciones) — no aplica escrow
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS hold_status TEXT
    CHECK (hold_status IN ('held', 'released', 'refunded'));

-- hold_until: ventana de disputa.
-- Definimos un período (ej: 48h después de la videollamada) durante el cual
-- el usuario puede reportar un no-show. Pasado este tiempo, el cron job
-- puede liberar el escrow automáticamente sin intervención manual.
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ;

-- hold_reason: texto libre para entender por qué están retenidos los fondos.
-- Ejemplos: 'videocall_pending', 'dispute_open', 'waiting_creator_confirmation'
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS hold_reason TEXT;

-- booking_id: FK hacia el booking de videollamada asociado a este pago.
-- Permite hacer JOIN eficiente en queries como:
-- "¿Qué pagos corresponden a bookings completados que aún no se liberaron?"
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS booking_id INTEGER
    REFERENCES public.users_agendas(id) ON DELETE SET NULL;

-- Índice para el cron job que libera escrows vencidos:
-- "dame todos los pagos en hold que ya pasaron hold_until"
CREATE INDEX IF NOT EXISTS idx_payments_hold_status
    ON public.payments(hold_status)
    WHERE hold_status = 'held';

CREATE INDEX IF NOT EXISTS idx_payments_hold_until
    ON public.payments(hold_until)
    WHERE hold_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_booking_id
    ON public.payments(booking_id)
    WHERE booking_id IS NOT NULL;

COMMENT ON COLUMN public.payments.hold_status  IS 'Estado del escrow: held=retenido, released=transferido al creator, refunded=devuelto al usuario.';
COMMENT ON COLUMN public.payments.hold_until   IS 'Ventana de disputa. Pasada esta fecha, el cron puede liberar el escrow automáticamente.';
COMMENT ON COLUMN public.payments.hold_reason  IS 'Razón del hold: videocall_pending, dispute_open, etc.';
COMMENT ON COLUMN public.payments.booking_id   IS 'FK a users_agendas. Relaciona el pago con la reserva de videollamada.';


-- =============================================================================
-- PARTE 3: Índice de apoyo en users_agendas para el cron de no-show detection
-- =============================================================================
--
-- El cron job `app/api/cron/check-appointments/route.ts` ya existe.
-- Necesitamos que también detecte videollamadas que PASARON su hora de fin
-- (date + end_time < NOW()) y tienen status='confirmed' pero call_room_created=false.
-- Esto indica que el creador nunca inició la sala → posible no-show.
-- Este índice compuesto acelera esa query.

CREATE INDEX IF NOT EXISTS idx_users_agendas_noshow_detection
    ON public.users_agendas(date, end_time, status, call_room_created)
    WHERE status = 'confirmed' AND call_room_created = FALSE;
