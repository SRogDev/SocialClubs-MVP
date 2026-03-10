-- =============================================================================
-- MIGRATION: Trigger de push notifications via pg_net
-- Fecha: 2026-03-03
-- =============================================================================
--
-- CAMBIOS:
--
--   1. Habilita pg_net (extensión de Supabase para HTTP calls desde PostgreSQL).
--
--   2. Crea función handle_notification_push() que llama al endpoint Vercel
--      /api/notifications/push cada vez que se inserta en notifications.
--      Lee la URL y el secret de variables de configuración de la DB para
--      no hardcodear credenciales en el código de la migration.
--
--   3. Crea el trigger on_notification_insert_push sobre notifications.
--
-- SETUP REQUERIDO (ejecutar UNA VEZ en el SQL Editor de Supabase):
--
--   ALTER DATABASE postgres
--     SET "app.settings.push_webhook_url" = 'https://tu-app.vercel.app/api/notifications/push';
--
--   ALTER DATABASE postgres
--     SET "app.settings.push_webhook_secret" = 'el-mismo-valor-que-SUPABASE_WEBHOOK_SECRET';
--
--   SELECT pg_reload_conf();
--
-- Esas configuraciones persisten en todas las conexiones futuras.
-- Si no están definidas, el trigger hace silenciosamente nada (missing_ok = true).
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. pg_net: extensión de HTTP async para PostgreSQL
-- -----------------------------------------------------------------------------
-- Habilitada por defecto en Supabase. CREATE EXTENSION IF NOT EXISTS es idempotente.
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;


-- -----------------------------------------------------------------------------
-- 2. Función del trigger: hace POST a Vercel con el payload del row insertado
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_notification_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _url    TEXT;
    _secret TEXT;
BEGIN
    -- Leer configuración de la DB (missing_ok = true → devuelve NULL si no existe)
    _url    := current_setting('app.settings.push_webhook_url',    true);
    _secret := current_setting('app.settings.push_webhook_secret', true);

    -- Salir silenciosamente si no está configurado (dev/staging sin push)
    IF _url IS NULL OR _url = '' THEN
        RETURN NEW;
    END IF;

    -- HTTP POST asíncrono vía pg_net (fire-and-forget, no bloquea la TX)
    -- El payload imita exactamente el formato de Supabase Database Webhooks
    -- para que el handler /api/notifications/push no necesite distinguir el origen.
    PERFORM extensions.http_post(
        url     := _url,
        headers := jsonb_build_object(
            'Content-Type',     'application/json',
            'x-webhook-secret', COALESCE(_secret, '')
        ),
        body    := jsonb_build_object(
            'type',       'INSERT',
            'table',      'notifications',
            'schema',     'public',
            'record',     row_to_json(NEW),
            'old_record', NULL::jsonb
        )::text
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_notification_push() IS
    'Dispara un HTTP POST a /api/notifications/push cuando se inserta en notifications. '
    'Requiere app.settings.push_webhook_url y app.settings.push_webhook_secret en la DB config.';


-- -----------------------------------------------------------------------------
-- 3. Trigger: AFTER INSERT en notifications
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;

CREATE TRIGGER on_notification_insert_push
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_notification_push();

COMMENT ON TRIGGER on_notification_insert_push ON public.notifications IS
    'Envía push notification vía OneSignal para cada nueva fila en notifications.';
