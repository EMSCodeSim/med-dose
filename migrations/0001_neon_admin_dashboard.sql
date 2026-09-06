-- MyMedDose shared admin workspace.
-- Apply with the direct database connection; browser access is only through
-- Neon Auth + Data API and is enforced by the RLS policies below.

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'reviewer')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_workspace (
  id text PRIMARY KEY,
  medication_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviews jsonb NOT NULL DEFAULT '{}'::jsonb,
  catalog jsonb NOT NULL DEFAULT '{}'::jsonb,
  clinical_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id text NOT NULL DEFAULT (auth.user_id()),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_mymeddose_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_allowlist allowed
    JOIN neon_auth."user" auth_user
      ON lower(auth_user.email) = lower(allowed.email)
    WHERE auth_user.id::text = auth.user_id()
      AND allowed.active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_mymeddose_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mymeddose_admin() TO authenticated;

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_manage_allowlist ON public.admin_allowlist;
CREATE POLICY admin_manage_allowlist ON public.admin_allowlist
  FOR ALL TO authenticated
  USING (public.is_mymeddose_admin())
  WITH CHECK (public.is_mymeddose_admin());

DROP POLICY IF EXISTS admin_manage_workspace ON public.admin_workspace;
CREATE POLICY admin_manage_workspace ON public.admin_workspace
  FOR ALL TO authenticated
  USING (public.is_mymeddose_admin())
  WITH CHECK (public.is_mymeddose_admin());

DROP POLICY IF EXISTS admin_read_audit_log ON public.admin_audit_log;
CREATE POLICY admin_read_audit_log ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_mymeddose_admin());

DROP POLICY IF EXISTS admin_write_audit_log ON public.admin_audit_log;
CREATE POLICY admin_write_audit_log ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mymeddose_admin());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_allowlist TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_workspace TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.admin_audit_log_id_seq TO authenticated;

INSERT INTO public.admin_allowlist (email, role)
VALUES ('davidagallaher@hotmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET active = true, role = 'admin';

INSERT INTO public.admin_workspace (id)
VALUES ('primary')
ON CONFLICT (id) DO NOTHING;
