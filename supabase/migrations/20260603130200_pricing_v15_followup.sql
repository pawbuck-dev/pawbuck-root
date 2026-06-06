-- Pricing v1.5 follow-up: assert AI journal quota (read-only check before interview start).

CREATE OR REPLACE FUNCTION public.assert_ai_journal_quota (p_user_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_plan text;
  v_max int;
  v_used int;
BEGIN
  SELECT COALESCE(plan, 'free') INTO v_plan FROM public.user_entitlements WHERE user_id = p_user_id;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  IF v_plan IN ('individual', 'family', 'premium') THEN
    RETURN;
  END IF;
  SELECT max_ai_journal_entries INTO v_max FROM public.subscription_limits WHERE plan = 'free';
  IF v_max IS NULL THEN
    RETURN;
  END IF;
  SELECT COALESCE(ai_journal_entries_used, 0) INTO v_used
  FROM public.user_subscription_usage
  WHERE user_id = p_user_id;
  v_used := COALESCE(v_used, 0);
  IF v_used >= v_max THEN
    RAISE EXCEPTION 'AI journal entry limit reached (% lifetime). Upgrade to Individual for unlimited entries.', v_max
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_ai_journal_quota (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_ai_journal_quota (uuid) TO service_role;
