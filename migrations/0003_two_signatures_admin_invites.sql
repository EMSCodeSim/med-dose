-- Two current approvals are required for release. A third authorized reviewer
-- may participate, and each reviewer can retain a professional title.

ALTER TABLE public.admin_allowlist
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Administrator',
  ADD COLUMN IF NOT EXISTS invited_by text;

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
        AND (
          SELECT count(*)
          FROM jsonb_each(COALESCE(review->'signatures', '{}'::jsonb)) AS signature
          WHERE signature.value ? 'approvedAt'
        ) >= 2
    ) INTO has_current_approval;

    IF NOT has_current_approval THEN
      RAISE EXCEPTION 'Medication % does not have two current approvals', medication_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
