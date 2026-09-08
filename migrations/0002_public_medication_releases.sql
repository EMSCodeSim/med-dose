-- Immutable, versioned medication libraries published by an approved admin.
-- Anonymous field devices receive SELECT-only access through RLS.

CREATE TABLE IF NOT EXISTS public.medication_releases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_version bigint NOT NULL UNIQUE CHECK (release_version > 0),
  protocol_revision text NOT NULL,
  payload jsonb NOT NULL,
  medication_count integer NOT NULL CHECK (medication_count >= 0),
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by text
);

CREATE INDEX IF NOT EXISTS medication_releases_latest_idx
  ON public.medication_releases (release_version DESC);

CREATE OR REPLACE FUNCTION public.validate_medication_release()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  medication_id text;
  medication_record jsonb;
  has_current_approval boolean;
BEGIN
  IF NEW.payload->>'schemaVersion' <> '1'
    OR jsonb_typeof(NEW.payload->'medicationIds') <> 'array'
    OR jsonb_array_length(NEW.payload->'medicationIds') <> NEW.medication_count
    OR NEW.medication_count < 1 THEN
    RAISE EXCEPTION 'Release payload is invalid or medication count does not match';
  END IF;

  FOR medication_id IN SELECT jsonb_array_elements_text(NEW.payload->'medicationIds')
  LOOP
    medication_record := NEW.payload->'medicationState'->medication_id;
    IF medication_record IS NULL
      OR medication_record ? 'draft'
      OR medication_record ? 'reviewStartedAt' THEN
      RAISE EXCEPTION 'Medication % is not ready for release', medication_id;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(medication_record->'history', '[]'::jsonb)) AS review
      WHERE review->>'protocolRevision' = NEW.protocol_revision
        AND review->>'clinicalRevision' = medication_record->>'clinicalRevision'
        AND (SELECT count(*) FROM jsonb_object_keys(COALESCE(review->'signatures', '{}'::jsonb))) = 3
    ) INTO has_current_approval;

    IF NOT has_current_approval THEN
      RAISE EXCEPTION 'Medication % does not have all three current approvals', medication_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_medication_release_before_insert ON public.medication_releases;
CREATE TRIGGER validate_medication_release_before_insert
  BEFORE INSERT ON public.medication_releases
  FOR EACH ROW EXECUTE FUNCTION public.validate_medication_release();

ALTER TABLE public.medication_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_medication_releases ON public.medication_releases;
CREATE POLICY public_read_medication_releases ON public.medication_releases
  FOR SELECT TO anonymous, authenticated
  USING (true);

DROP POLICY IF EXISTS admin_publish_medication_releases ON public.medication_releases;
CREATE POLICY admin_publish_medication_releases ON public.medication_releases
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mymeddose_admin());

GRANT USAGE ON SCHEMA public TO anonymous;
GRANT SELECT ON public.medication_releases TO anonymous;
GRANT SELECT, INSERT ON public.medication_releases TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.medication_releases_id_seq TO authenticated;
