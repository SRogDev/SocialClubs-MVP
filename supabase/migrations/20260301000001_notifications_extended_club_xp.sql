-- =============================================================================
-- MIGRATION: Notificaciones extendidas + Club XP + Trigger de Level-Up
-- Fecha: 2026-03-01
-- =============================================================================
--
-- CAMBIOS:
--
--   1. Extiende la tabla `notifications` con columnas adicionales para soportar
--      notificaciones in-app ricas (club_id, action_url, icon, category, metadata).
--
--   2. Añade columna `xp` a la tabla `clubs` para rastrear la experiencia
--      acumulada del club (base del sistema de niveles).
--
--   3. Crea un trigger que detecta cambios en `clubs.level` y genera
--      notificaciones automáticas para TODOS los miembros del club.
--
--   4. RLS para notifications: usuarios solo leen/modifican las suyas.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- EXTEND: notifications table
-- -----------------------------------------------------------------------------

-- Club asociado (NULL = notificación global/de plataforma)
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

-- URL de acción al hacer click en la notificación
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Icono/emoji de la notificación
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🔔';

-- Categoría: engagement, transactional, marketing
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'engagement'
    CHECK (category IN ('engagement', 'transactional', 'marketing'));

-- Metadata adicional (flexible JSONB para data extra)
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id)
    WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_club_id
    ON public.notifications(club_id)
    WHERE club_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- EXTEND: clubs table — añadir XP
-- -----------------------------------------------------------------------------

ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS xp BIGINT DEFAULT 0;

COMMENT ON COLUMN public.clubs.xp IS 'Experiencia acumulada del club. Determina el nivel junto con umbrales dinámicos globales.';
COMMENT ON COLUMN public.clubs.level IS 'Nivel actual del club (1-10). Calculado a partir de xp y umbrales dinámicos.';


-- -----------------------------------------------------------------------------
-- TRIGGER: Notificación automática cuando un club sube de nivel
-- -----------------------------------------------------------------------------
-- Cuando se actualiza `clubs.level` hacia arriba, inserta una notificación
-- para CADA miembro del club (via users_clubs).

CREATE OR REPLACE FUNCTION public.notify_club_level_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Solo actuar si el nivel subió (no si bajó o no cambió)
    IF NEW.level IS DISTINCT FROM OLD.level AND NEW.level > OLD.level THEN
        INSERT INTO public.notifications (user_id, type, title, body, club_id, action_url, icon, category, metadata)
        SELECT
            uc.user_id,
            'club_level_up',
            '🚀 ¡' || COALESCE(NEW.name, 'Tu club') || ' subió de nivel!',
            'El club alcanzó el nivel ' || NEW.level || '. ¡Sigan así!',
            NEW.id,
            '/clubs/' || NEW.id,
            '🚀',
            'engagement',
            jsonb_build_object(
                'old_level', OLD.level,
                'new_level', NEW.level,
                'club_name', NEW.name,
                'club_color', NEW.color
            )
        FROM public.users_clubs uc
        WHERE uc.club_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger solo en UPDATE de la columna level
DROP TRIGGER IF EXISTS on_club_level_change ON public.clubs;
CREATE TRIGGER on_club_level_change
    AFTER UPDATE OF level ON public.clubs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_club_level_up();

COMMENT ON FUNCTION public.notify_club_level_up() IS 'Genera notificaciones para todos los miembros cuando un club sube de nivel.';


-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY: notifications
-- -----------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuarios leen solo sus propias notificaciones
CREATE POLICY "users_read_own_notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

-- El sistema (triggers, services) inserta notificaciones — se hace via SECURITY DEFINER
-- Los admins de plataforma pueden leer todas
CREATE POLICY "platform_admins_read_all_notifications"
    ON public.notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Usuarios solo pueden actualizar sus propias notificaciones (marcar como leída)
CREATE POLICY "users_update_own_notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "users_delete_own_notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());


-- =============================================================================
-- REALTIME: Habilitar realtime para notifications (necesario para listeners)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
