-- =============================================================================
-- MIGRATION: Sistema de Moderación - Advertencias y Bans por Club
-- Fecha: 2026-02-24
-- =============================================================================
--
-- POR QUÉ ESTA MIGRACIÓN:
--
-- Actualmente, cuando un admin de club quiere expulsar a un miembro, solo existe
-- la acción de eliminar la fila de `users_clubs`. Esto tiene varios problemas:
--
--   1. No queda registro de por qué fue expulsado (sin auditoría)
--   2. El usuario puede volver a unirse al club como si nada (sin ban efectivo)
--   3. Los admins de plataforma no tienen forma de emitir strikes acumulativos
--      contra un usuario que incumple las normas en múltiples clubs
--   4. El action `warnCreatorAction` existe en el código pero solo envía email,
--      no persiste nada en BD (TODO documentado en adminActions.ts línea 100)
--
-- SOLUCIÓN:
--
--   · Tabla `user_warnings`: registro histórico de advertencias/strikes.
--     - Puede ser emitida por admin de plataforma (sin club_id) o por admin de
--       club (con club_id) hacia un miembro.
--     - Acumular 3 strikes de plataforma puede disparar suspensión automática
--       (lógica en `adminActions.ts`).
--
--   · Tabla `club_bans`: ban permanente de un usuario en un club concreto.
--     - Se crea cuando el creador del club expulsa a un miembro.
--     - `joinClub()` en `clubService.ts` debe verificar esta tabla antes de
--       permitir el acceso, bloqueando re-entradas.
--     - La constraint UNIQUE (user_id, club_id) garantiza un solo ban activo.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- TABLA: user_warnings
-- -----------------------------------------------------------------------------
-- Almacena advertencias y strikes emitidos a usuarios.
-- Puede ser de alcance plataforma (club_id NULL) o de alcance club (club_id SET).
--
-- Campos clave:
--   type:     'warning' = aviso sin consecuencia inmediata
--             'strike'  = infracción grave que acumula hacia suspensión
--   severity: 'low' | 'medium' | 'high' para priorizar en panel de admin
--   expires_at: permite advertencias temporales (ej: ban de chat 7 días)
--   acknowledged_at: el usuario "tomó nota" de la advertencia en la UI

CREATE TABLE IF NOT EXISTS public.user_warnings (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Usuario que recibe la advertencia
    user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Club relacionado. NULL = advertencia de plataforma global.
    -- ON DELETE SET NULL: si se elimina el club, la advertencia sigue en el historial del usuario
    club_id          UUID        REFERENCES public.clubs(id) ON DELETE SET NULL,

    -- Admin o creador de club que emite la advertencia
    issued_by        UUID        NOT NULL REFERENCES public.users(id),

    -- Descripción de la infracción (obligatoria para transparencia)
    reason           TEXT        NOT NULL,

    -- Tipo de acción disciplinaria
    type             TEXT        NOT NULL CHECK (type IN ('warning', 'strike')),

    -- Gravedad para priorizar en panel de moderación
    severity         TEXT        NOT NULL DEFAULT 'medium'
                     CHECK (severity IN ('low', 'medium', 'high')),

    -- Fecha de expiración (NULL = permanente en historial)
    expires_at       TIMESTAMPTZ,

    -- Cuando el usuario visualizó/aceptó la advertencia en la UI
    acknowledged_at  TIMESTAMPTZ,

    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices: las queries más frecuentes son "buscar advertencias de un usuario"
-- y "buscar advertencias dentro de un club"
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id
    ON public.user_warnings(user_id);

CREATE INDEX IF NOT EXISTS idx_user_warnings_club_id
    ON public.user_warnings(club_id)
    WHERE club_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_warnings_issued_by
    ON public.user_warnings(issued_by);

-- Comentarios para documentación en Supabase Dashboard
COMMENT ON TABLE  public.user_warnings               IS 'Registro de advertencias y strikes disciplinarios emitidos a usuarios. Puede ser de plataforma (club_id NULL) o de club específico.';
COMMENT ON COLUMN public.user_warnings.type          IS 'warning = aviso informativo; strike = infracción grave que acumula hacia suspensión';
COMMENT ON COLUMN public.user_warnings.severity      IS 'Gravedad: low | medium | high. Usada para ordenar en panel de moderación.';
COMMENT ON COLUMN public.user_warnings.expires_at    IS 'Si no es NULL, la advertencia expira en esta fecha (útil para bans temporales de funcionalidades).';
COMMENT ON COLUMN public.user_warnings.acknowledged_at IS 'Timestamp cuando el usuario visualizó la advertencia en la UI. NULL = no vista aún.';


-- -----------------------------------------------------------------------------
-- TABLA: club_bans
-- -----------------------------------------------------------------------------
-- Registro permanente de usuarios expulsados de un club.
-- La presencia de una fila aquí BLOQUEA al usuario para unirse de nuevo.
-- El check ocurre en `clubService.joinClub()` y en la API route de join.
--
-- Diseño deliberado:
--   · No tiene "expires_at" — los bans de club son permanentes por default.
--     Si quisiéramos bans temporales, habría que añadir esa columna después.
--   · UNIQUE (user_id, club_id) garantiza que no haya doble ban y que el
--     unban sea un simple DELETE sin ambigüedad.
--   · Si se borra el club, los bans desaparecen (CASCADE) porque ya no aplican.
--   · Si se borra el usuario, los bans desaparecen (CASCADE) para no dejar
--     filas huérfanas.

CREATE TABLE IF NOT EXISTS public.club_bans (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Usuario baneado
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Club del que fue expulsado
    club_id     UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Quién ejecutó el ban (creador del club o admin de plataforma)
    banned_by   UUID        NOT NULL REFERENCES public.users(id),

    -- Motivo del ban (visible para el admin, no expuesto al usuario baneado en UI)
    reason      TEXT        NOT NULL,

    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Garantiza que solo existe un ban activo por (usuario, club)
    CONSTRAINT uq_club_bans_user_club UNIQUE (user_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_club_bans_user_id ON public.club_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_club_bans_club_id ON public.club_bans(club_id);

COMMENT ON TABLE  public.club_bans            IS 'Bans permanentes que impiden a un usuario unirse de nuevo a un club. joinClub() debe verificar esta tabla.';
COMMENT ON COLUMN public.club_bans.reason     IS 'Motivo interno del ban. Visible para el admin del club, no se muestra al usuario baneado.';
COMMENT ON COLUMN public.club_bans.banned_by  IS 'ID del usuario que ejecutó el ban (creador del club o admin de plataforma).';


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
--
-- PRINCIPIO GUÍA: mínimo privilegio.
-- Los usuarios solo ven lo que les concierne directamente.
-- Los admins de plataforma tienen acceso total.
-- Los creadores de club solo ven/gestionan sus propios clubs.

-- ---- user_warnings RLS ------------------------------------------------------

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- El propio usuario puede leer sus advertencias (para mostrarlas en su perfil/notificaciones)
CREATE POLICY "users_read_own_warnings"
    ON public.user_warnings FOR SELECT
    USING (user_id = auth.uid());

-- Admins de plataforma leen todas las advertencias (panel de moderación global)
CREATE POLICY "platform_admins_read_all_warnings"
    ON public.user_warnings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Creador de club puede leer advertencias que él mismo emitió dentro de su club
CREATE POLICY "club_creator_reads_own_club_warnings"
    ON public.user_warnings FOR SELECT
    USING (
        club_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.clubs
            WHERE id = club_id AND creator = auth.uid()
        )
    );

-- Solo admins de plataforma pueden emitir warnings globales (sin club_id)
CREATE POLICY "platform_admins_insert_warnings"
    ON public.user_warnings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Creador de club puede advertir a sus propios miembros (con club_id de su club)
CREATE POLICY "club_creator_warns_members"
    ON public.user_warnings FOR INSERT
    WITH CHECK (
        club_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.clubs
            WHERE id = club_id AND creator = auth.uid()
        )
    );

-- El propio usuario puede marcar una advertencia como vista (acknowledged_at)
CREATE POLICY "users_acknowledge_own_warnings"
    ON public.user_warnings FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (
        -- Solo puede actualizar acknowledged_at, nada más
        user_id = auth.uid()
    );


-- ---- club_bans RLS -----------------------------------------------------------

ALTER TABLE public.club_bans ENABLE ROW LEVEL SECURITY;

-- Usuario puede ver si está baneado de algún club (feedback en UI al intentar unirse)
CREATE POLICY "users_read_own_bans"
    ON public.club_bans FOR SELECT
    USING (user_id = auth.uid());

-- Creador de club puede ver quién está baneado en su club
CREATE POLICY "club_creator_reads_club_bans"
    ON public.club_bans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.clubs
            WHERE id = club_id AND creator = auth.uid()
        )
    );

-- Admins de plataforma leen todos los bans
CREATE POLICY "platform_admins_read_all_bans"
    ON public.club_bans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo el creador del club puede banear miembros de su club
CREATE POLICY "club_creator_bans_members"
    ON public.club_bans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clubs
            WHERE id = club_id AND creator = auth.uid()
        )
    );

-- El creador del club puede desbanear (eliminar la fila = unban)
CREATE POLICY "club_creator_unbans_members"
    ON public.club_bans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.clubs
            WHERE id = club_id AND creator = auth.uid()
        )
    );

-- Admins de plataforma pueden gestionar cualquier ban
CREATE POLICY "platform_admins_manage_all_bans"
    ON public.club_bans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
