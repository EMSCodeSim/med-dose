-- End-user medication reports submitted when they are shared or printed/saved.
-- Field devices may insert only. Authorized administrators may read and review.

CREATE TABLE IF NOT EXISTS public.calculation_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id uuid NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN ('shared', 'printed_or_saved')),
  incident_reference text CHECK (incident_reference IS NULL OR char_length(incident_reference) <= 100),
  provider_identifier text CHECK (provider_identifier IS NULL OR char_length(provider_identifier) <= 100),
  entries jsonb NOT NULL CHECK (
    jsonb_typeof(entries) = 'array'
    AND jsonb_array_length(entries) BETWEEN 1 AND 50
    AND octet_length(entries::text) <= 100000
  ),
  entry_count integer NOT NULL CHECK (entry_count BETWEEN 1 AND 50),
  client_created_at timestamptz NOT NULL,
  release_version bigint,
  protocol_revision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  CHECK (entry_count = jsonb_array_length(entries))
);

CREATE INDEX IF NOT EXISTS calculation_reports_created_idx
  ON public.calculation_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS calculation_reports_unreviewed_idx
  ON public.calculation_reports (created_at DESC)
  WHERE reviewed_at IS NULL;

ALTER TABLE public.calculation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY field_submit_calculation_reports ON public.calculation_reports
  FOR INSERT TO anonymous, authenticated
  WITH CHECK (
    reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND review_note IS NULL
    AND entry_count = jsonb_array_length(entries)
  );

CREATE POLICY admin_read_calculation_reports ON public.calculation_reports
  FOR SELECT TO authenticated
  USING (public.is_mymeddose_admin());

CREATE POLICY admin_review_calculation_reports ON public.calculation_reports
  FOR UPDATE TO authenticated
  USING (public.is_mymeddose_admin())
  WITH CHECK (public.is_mymeddose_admin());

GRANT INSERT (
  report_id,
  event_type,
  entries,
  entry_count,
  client_created_at,
  release_version,
  protocol_revision
) ON public.calculation_reports TO anonymous, authenticated;
REVOKE INSERT (incident_reference, provider_identifier)
  ON public.calculation_reports FROM anonymous, authenticated;
GRANT SELECT, UPDATE (reviewed_at, reviewed_by, review_note)
  ON public.calculation_reports TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.calculation_reports_id_seq TO anonymous, authenticated;
