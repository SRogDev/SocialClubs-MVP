-- Create the missing club_reports table.
-- The trigger update_club_reports_timestamp in database.sql and
-- adminService.getClubsWithReports() both reference this table, but the
-- CREATE TABLE was never shipped — fresh DBs fail on the trigger and the
-- admin reports page throws. This migration makes the moderation-report
-- pipeline coherent: users report clubs, admins review them.
-- Report types match the buckets in getClubsWithReports().

CREATE TABLE IF NOT EXISTS public.club_reports (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Club reportado
    club_id          UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Usuario que reporta (puede ser NULL si el reporte es anónimo/sistema)
    reporter_id      UUID        REFERENCES public.users(id) ON DELETE SET NULL,

    -- Categoría del reporte
    type             TEXT        NOT NULL
                     CHECK (type IN ('sexual_content', 'extreme_violence', 'scam', 'spam')),

    -- Estado de moderación
    status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),

    -- Detalle opcional del reporte
    description      TEXT,

    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_club_reports_club_id
    ON public.club_reports(club_id);

CREATE INDEX IF NOT EXISTS idx_club_reports_status
    ON public.club_reports(status)
    WHERE status = 'pending';

-- Reuse the updated_at trigger function defined in database.sql;
-- create it here too so the migration is self-contained.
CREATE OR REPLACE FUNCTION update_club_reports_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_club_reports_timestamp ON public.club_reports;
CREATE TRIGGER update_club_reports_timestamp
  BEFORE UPDATE ON public.club_reports
  FOR EACH ROW EXECUTE FUNCTION update_club_reports_updated_at();

COMMENT ON TABLE public.club_reports IS 'Reportes de moderación sobre clubs. Los revisan los admins en /admin (getClubsWithReports).';
