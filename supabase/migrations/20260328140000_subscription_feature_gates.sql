-- Global paywall toggles: which product areas require premium. Read by mobile (RLS) and PawBuck.API (Postgres role bypasses RLS). Admin updates via PawBuck.API /api/support only.

CREATE TABLE IF NOT EXISTS public.subscription_feature_gates (
  feature_key text PRIMARY KEY,
  requires_premium boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_feature_gates IS 'Admin-controlled: when requires_premium is true, the feature is gated behind PawBuck Premium.';

INSERT INTO public.subscription_feature_gates (feature_key, requires_premium, label, sort_order) VALUES
  ('milo_chat', true, 'Milo AI chat', 10),
  ('pet_journal', true, 'Pet journal', 20),
  ('health_briefing', true, 'Health briefing', 30),
  ('weekly_challenge', true, 'Weekly challenge', 40),
  ('book_vet', true, 'Book a vet visit', 50)
ON CONFLICT (feature_key) DO NOTHING;

ALTER TABLE public.subscription_feature_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_feature_gates_select_authenticated"
  ON public.subscription_feature_gates FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.subscription_feature_gates TO authenticated;
