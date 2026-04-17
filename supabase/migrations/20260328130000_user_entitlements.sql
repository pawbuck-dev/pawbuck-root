-- Subscription entitlements: mirrored from store/RevenueCat webhooks; read by mobile app (RLS) and PawBuck.API (direct Postgres).

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscription_status text,
  expires_at timestamptz,
  provider_customer_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_entitlements IS 'Per-user subscription tier; updated by RevenueCat webhook (service role), not by clients directly.';

CREATE INDEX IF NOT EXISTS user_entitlements_plan_idx ON public.user_entitlements (plan);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read only their own row (for client entitlement checks).
CREATE POLICY "user_entitlements_select_own"
  ON public.user_entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for authenticated role; service role bypasses RLS for webhook upserts.

GRANT SELECT ON public.user_entitlements TO authenticated;
