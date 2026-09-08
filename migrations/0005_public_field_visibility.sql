-- Immediate field-use deny list. Hiding a medication is a safety removal and
-- does not wait for a full medication release. Anonymous devices may read only.

CREATE TABLE IF NOT EXISTS public.field_medication_visibility (
  medication_id text PRIMARY KEY CHECK (
    char_length(medication_id) BETWEEN 1 AND 100
    AND medication_id ~ '^[a-z0-9][a-z0-9-]*$'
  ),
  hidden boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.field_medication_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_field_medication_visibility
  ON public.field_medication_visibility
  FOR SELECT TO anonymous, authenticated
  USING (true);

CREATE POLICY admin_insert_field_medication_visibility
  ON public.field_medication_visibility
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mymeddose_admin());

CREATE POLICY admin_update_field_medication_visibility
  ON public.field_medication_visibility
  FOR UPDATE TO authenticated
  USING (public.is_mymeddose_admin())
  WITH CHECK (public.is_mymeddose_admin());

GRANT SELECT ON public.field_medication_visibility TO anonymous, authenticated;
GRANT INSERT, UPDATE ON public.field_medication_visibility TO authenticated;

-- Carry existing admin visibility decisions into the public deny list.
INSERT INTO public.field_medication_visibility (medication_id, hidden, updated_at)
SELECT entry.key, true, now()
FROM public.admin_workspace workspace
CROSS JOIN LATERAL jsonb_each(workspace.catalog) entry
WHERE workspace.id = 'primary'
  AND (
    entry.value->>'visible' = 'false'
    OR entry.value->>'retired' = 'true'
    OR entry.value->>'pending' = 'true'
  )
ON CONFLICT (medication_id) DO UPDATE
SET hidden = EXCLUDED.hidden,
    updated_at = EXCLUDED.updated_at;

