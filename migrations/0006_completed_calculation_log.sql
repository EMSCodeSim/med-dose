-- Record every completed field calculation in the secure administrator calculation log.
ALTER TABLE public.calculation_reports
  DROP CONSTRAINT IF EXISTS calculation_reports_event_type_check;

ALTER TABLE public.calculation_reports
  ADD CONSTRAINT calculation_reports_event_type_check
  CHECK (event_type IN ('completed', 'shared', 'printed_or_saved'));
