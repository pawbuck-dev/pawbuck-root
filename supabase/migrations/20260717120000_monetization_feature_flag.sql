-- Monetization kill-switch (default OFF = free launch).
-- When monetization_enabled is false, pet/doc quotas and plan gates pass for everyone.
-- Flip via: UPDATE public.app_feature_flags SET enabled = true WHERE key = 'monetization_enabled';

CREATE TABLE IF NOT EXISTS public.app_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_feature_flags IS
  'Runtime product flags. monetization_enabled=false treats all users as Family for quotas/gates.';

INSERT INTO public.app_feature_flags (key, enabled)
VALUES ('monetization_enabled', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated clients may read flags (no write).
DROP POLICY IF EXISTS "app_feature_flags_select_authenticated" ON public.app_feature_flags;
CREATE POLICY "app_feature_flags_select_authenticated"
  ON public.app_feature_flags FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.app_feature_flags TO authenticated;
GRANT ALL ON public.app_feature_flags TO service_role;

CREATE OR REPLACE FUNCTION public.is_monetization_enabled ()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT COALESCE((
    SELECT enabled
    FROM public.app_feature_flags
    WHERE key = 'monetization_enabled'
    LIMIT 1
  ), false);
$$;

COMMENT ON FUNCTION public.is_monetization_enabled () IS
  'True when billing/paywalls are active. Missing flag row defaults to false (free launch).';

GRANT EXECUTE ON FUNCTION public.is_monetization_enabled () TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_monetization_enabled () TO service_role;
GRANT EXECUTE ON FUNCTION public.is_monetization_enabled () TO anon;

-- Plan gates always pass while monetization is off
CREATE OR REPLACE FUNCTION public.auth_user_meets_plan_gate (p_feature_key text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    CASE
      WHEN NOT public.is_monetization_enabled() THEN true
      ELSE public.subscription_plan_rank(public.auth_user_active_plan()) >= COALESCE((
        SELECT public.subscription_plan_rank(g.minimum_plan)
        FROM public.subscription_feature_gates g
        WHERE g.feature_key = p_feature_key
        LIMIT 1
      ), 0)
    END;
$$;

COMMENT ON FUNCTION public.auth_user_meets_plan_gate (text) IS
  'True when auth user plan rank >= gate minimum_plan (or gate row missing). Always true when monetization is off.';

-- Document quota skipped while monetization is off
CREATE OR REPLACE FUNCTION public.assert_document_quota (p_user_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_plan text;
  v_max int;
  v_count int;
BEGIN
  IF NOT public.is_monetization_enabled() THEN
    RETURN;
  END IF;

  SELECT plan INTO v_plan FROM public.user_entitlements WHERE user_id = p_user_id;
  v_plan := COALESCE(v_plan, 'free');
  SELECT max_documents INTO v_max FROM public.subscription_limits WHERE plan = v_plan;
  IF v_max IS NULL THEN
    RETURN;
  END IF;
  v_count := public.get_user_document_count(p_user_id);
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Document upload limit reached (% of %). Upgrade to Individual for unlimited uploads.', v_count, v_max
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- Pet limit skipped while monetization is off (still excludes soft-deleted pets when on)
CREATE OR REPLACE FUNCTION public.enforce_pet_plan_limit ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_plan text;
  v_max int;
  v_count int;
BEGIN
  IF NOT public.is_monetization_enabled() THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(plan, 'free') INTO v_plan FROM public.user_entitlements WHERE user_id = NEW.user_id;
  v_plan := COALESCE(v_plan, 'free');
  SELECT max_pets INTO v_max FROM public.subscription_limits WHERE plan = v_plan;
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*)::int INTO v_count
  FROM public.pets
  WHERE user_id = NEW.user_id
    AND deleted_at IS NULL;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Pet profile limit reached (%). Upgrade to Family for unlimited pets.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
