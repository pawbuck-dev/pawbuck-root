-- ONE-TIME: complimentary admin grants for users who exist at deploy time only.
-- Does NOT run for future signups (migration applies once; new auth.users rows are unaffected).
--
-- Rules:
--   0–1 owned pets (non-deleted) → individual
--   2+ owned pets → family
-- Skips users with an active App Store / RevenueCat entitlement (not admin_grant).
--
-- Verify (before/after):
--   SELECT plan, count(*) FROM user_entitlements GROUP BY 1;
-- Rollback: forward-only; revoke per user via admin portal or manual UPDATE.

CREATE TABLE IF NOT EXISTS public.one_time_ops_log (
  op_key text PRIMARY KEY,
  note text,
  applied_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.one_time_ops_log IS
  'Idempotency log for one-shot data migrations; not used by app runtime.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.one_time_ops_log WHERE op_key = 'admin_grant_by_pet_count_20260623'
  ) THEN
    RAISE NOTICE 'one_time admin_grant_by_pet_count already applied — skipping';
    RETURN;
  END IF;

  WITH owner_pets AS (
    SELECT p.user_id, COUNT(*)::int AS pet_count
    FROM public.pets p
    WHERE p.deleted_at IS NULL
    GROUP BY p.user_id
  ),
  eligible AS (
    SELECT
      u.id AS user_id,
      CASE
        WHEN COALESCE(op.pet_count, 0) > 1 THEN 'family'
        ELSE 'individual'
      END AS target_plan
    FROM auth.users u
    LEFT JOIN owner_pets op ON op.user_id = u.id
    LEFT JOIN public.user_entitlements ue ON ue.user_id = u.id
    WHERE NOT (
      ue.product_id IS NOT NULL
      AND ue.product_id <> 'admin_grant'
      AND (
        COALESCE(ue.is_founding_member, FALSE)
        OR ue.expires_at IS NULL
        OR ue.expires_at > now()
      )
    )
  )
  INSERT INTO public.user_entitlements (
    user_id,
    plan,
    subscription_status,
    expires_at,
    product_id,
    updated_at
  )
  SELECT
    e.user_id,
    e.target_plan,
    'ADMIN_GRANT',
    NULL,
    'admin_grant',
    now()
  FROM eligible e
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    subscription_status = EXCLUDED.subscription_status,
    expires_at = EXCLUDED.expires_at,
    product_id = EXCLUDED.product_id,
    updated_at = now();

  INSERT INTO public.one_time_ops_log (op_key, note)
  VALUES (
    'admin_grant_by_pet_count_20260623',
    'Complimentary individual (0-1 pets) or family (2+ pets) for auth.users at migration time'
  );
END $$;
