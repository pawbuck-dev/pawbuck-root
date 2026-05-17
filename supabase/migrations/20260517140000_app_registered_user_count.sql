-- Aggregate app user count for feature gates (weekly challenge visibility). No PII returned.

CREATE OR REPLACE FUNCTION public.app_registered_user_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COUNT(*)::bigint FROM auth.users;
$$;

REVOKE ALL ON FUNCTION public.app_registered_user_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_registered_user_count() TO authenticated;

COMMENT ON FUNCTION public.app_registered_user_count() IS
  'Total registered auth users; used for weekly challenge cohort gate (consumer app).';
