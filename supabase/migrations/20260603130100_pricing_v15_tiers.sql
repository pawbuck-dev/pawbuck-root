-- PawBuck v1.5 pricing: Free / Individual / Family tiers, usage counters, limits, founding cap.

-- ---------------------------------------------------------------------------
-- user_entitlements: expand plan enum + founding metadata
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_entitlements
  DROP CONSTRAINT IF EXISTS user_entitlements_plan_check;

UPDATE public.user_entitlements
SET plan = 'individual'
WHERE plan = 'premium';

ALTER TABLE public.user_entitlements
  ADD CONSTRAINT user_entitlements_plan_check
  CHECK (plan IN ('free', 'individual', 'family'));

ALTER TABLE public.user_entitlements
  ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_id text;

COMMENT ON COLUMN public.user_entitlements.is_founding_member IS 'Lifetime founding purchase; never expires.';
COMMENT ON COLUMN public.user_entitlements.product_id IS 'Store / RevenueCat product identifier.';

-- ---------------------------------------------------------------------------
-- Lifetime usage counters (server-incremented only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_subscription_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  milo_conversations_used int NOT NULL DEFAULT 0 CHECK (milo_conversations_used >= 0),
  ai_journal_entries_used int NOT NULL DEFAULT 0 CHECK (ai_journal_entries_used >= 0),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.user_subscription_usage IS 'Lifetime free-tier usage; incremented via SECURITY DEFINER RPCs only.';

ALTER TABLE public.user_subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscription_usage_select_own"
  ON public.user_subscription_usage FOR SELECT TO authenticated
  USING (auth.uid () = user_id);

GRANT SELECT ON public.user_subscription_usage TO authenticated;

-- ---------------------------------------------------------------------------
-- Per-plan numeric limits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_limits (
  plan text PRIMARY KEY CHECK (plan IN ('free', 'individual', 'family')),
  max_pets int,
  max_documents int,
  max_family_members int NOT NULL DEFAULT 0,
  max_milo_conversations int,
  max_ai_journal_entries int,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.subscription_limits (plan, max_pets, max_documents, max_family_members, max_milo_conversations, max_ai_journal_entries)
VALUES
  ('free', 1, 10, 0, 3, 2),
  ('individual', 1, NULL, 0, NULL, NULL),
  ('family', NULL, NULL, 5, NULL, NULL)
ON CONFLICT (plan) DO UPDATE SET
  max_pets = EXCLUDED.max_pets,
  max_documents = EXCLUDED.max_documents,
  max_family_members = EXCLUDED.max_family_members,
  max_milo_conversations = EXCLUDED.max_milo_conversations,
  max_ai_journal_entries = EXCLUDED.max_ai_journal_entries,
  updated_at = timezone('utc'::text, now());

ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_limits_select_authenticated"
  ON public.subscription_limits FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.subscription_limits TO authenticated;

-- ---------------------------------------------------------------------------
-- Feature gates: minimum_plan tier (replaces boolean-only model)
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_feature_gates
  ADD COLUMN IF NOT EXISTS minimum_plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.subscription_feature_gates
  DROP CONSTRAINT IF EXISTS subscription_feature_gates_minimum_plan_check;

ALTER TABLE public.subscription_feature_gates
  ADD CONSTRAINT subscription_feature_gates_minimum_plan_check
  CHECK (minimum_plan IN ('free', 'individual', 'family'));

-- Backfill from legacy requires_premium + known keys
UPDATE public.subscription_feature_gates SET minimum_plan = 'individual', requires_premium = true
WHERE feature_key IN (
  'milo_symptom_trees', 'health_briefing', 'email_parsing', 'pet_passport_export',
  'health_alerts', 'document_upload', 'ai_journal_entry'
);

UPDATE public.subscription_feature_gates SET minimum_plan = 'family', requires_premium = true
WHERE feature_key IN ('family_sharing', 'multi_pet', 'multi_pet_dashboard', 'family_permissions', 'per_pet_email');

UPDATE public.subscription_feature_gates SET minimum_plan = 'free', requires_premium = false
WHERE feature_key IN ('pet_journal', 'book_vet', 'pet_transfer', 'weekly_challenge', 'milo_chat');

UPDATE public.subscription_feature_gates SET minimum_plan = 'family', requires_premium = true
WHERE feature_key = 'family_sharing';

UPDATE public.subscription_feature_gates SET minimum_plan = 'free', requires_premium = false
WHERE feature_key = 'pet_transfer';

INSERT INTO public.subscription_feature_gates (feature_key, requires_premium, minimum_plan, label, sort_order)
VALUES
  ('document_upload', false, 'individual', 'Vet document uploads (beyond free cap)', 12),
  ('ai_journal_entry', false, 'individual', 'AI-generated journal entries', 18),
  ('milo_symptom_trees', true, 'individual', 'Symptom decision trees', 11),
  ('email_parsing', true, 'individual', 'Pet email parsing (milo@)', 35),
  ('pet_passport_export', true, 'individual', 'Pet Passport PDF export', 36),
  ('health_alerts', true, 'individual', 'Health alerts & reminders', 37),
  ('multi_pet', true, 'family', 'Multiple pet profiles', 14),
  ('multi_pet_dashboard', true, 'family', 'Multi-pet household dashboard', 16),
  ('family_permissions', true, 'family', '3-tier permission model', 17),
  ('per_pet_email', true, 'family', 'Per-pet email addresses', 38)
ON CONFLICT (feature_key) DO UPDATE SET
  minimum_plan = EXCLUDED.minimum_plan,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = timezone('utc'::text, now());

-- milo_chat: free users get taste (usage cap), not full gate
UPDATE public.subscription_feature_gates
SET minimum_plan = 'free', requires_premium = false, label = 'Milo AI chat (usage cap on free)', updated_at = now()
WHERE feature_key = 'milo_chat';

UPDATE public.subscription_feature_gates
SET minimum_plan = 'free', requires_premium = false, updated_at = now()
WHERE feature_key IN ('pet_journal', 'health_briefing', 'book_vet', 'weekly_challenge', 'pet_transfer');

-- health_briefing: free teaser; full content individual+
UPDATE public.subscription_feature_gates
SET minimum_plan = 'individual', requires_premium = true, label = 'Full vet prep briefs', updated_at = now()
WHERE feature_key = 'health_briefing';

-- ---------------------------------------------------------------------------
-- Founding member cap (500)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founding_member_counter (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  purchase_count int NOT NULL DEFAULT 0 CHECK (purchase_count >= 0)
);

INSERT INTO public.founding_member_counter (id, purchase_count)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.founding_member_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('individual', 'family')),
  product_id text,
  purchased_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id)
);

-- ---------------------------------------------------------------------------
-- Tier helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.subscription_plan_rank (p_plan text)
  RETURNS int
  LANGUAGE sql
  IMMUTABLE
  AS $$
  SELECT CASE p_plan
    WHEN 'family' THEN 2
    WHEN 'individual' THEN 1
    WHEN 'premium' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_active_plan ()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT COALESCE((
    SELECT u.plan
    FROM public.user_entitlements u
    WHERE u.user_id = auth.uid ()
      AND (
        u.is_founding_member = TRUE
        OR u.expires_at IS NULL
        OR u.expires_at > now()
      )
    LIMIT 1
  ), 'free');
$$;

CREATE OR REPLACE FUNCTION public.auth_user_meets_plan_gate (p_feature_key text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT public.subscription_plan_rank(public.auth_user_active_plan()) >= COALESCE((
    SELECT public.subscription_plan_rank(g.minimum_plan)
    FROM public.subscription_feature_gates g
    WHERE g.feature_key = p_feature_key
    LIMIT 1
  ), 0);
$$;

COMMENT ON FUNCTION public.auth_user_meets_plan_gate (text) IS
  'True when auth user plan rank >= gate minimum_plan (or gate row missing).';

GRANT EXECUTE ON FUNCTION public.auth_user_meets_plan_gate (text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_active_plan () TO authenticated;

-- Replace legacy premium gate helper (keep name as alias)
CREATE OR REPLACE FUNCTION public.auth_user_passes_premium_gate (p_feature_key text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT public.auth_user_meets_plan_gate(p_feature_key);
$$;

-- ---------------------------------------------------------------------------
-- Usage + quota RPCs (service role + API)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_document_count (p_user_id uuid)
  RETURNS int
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT COALESCE((
    SELECT COUNT(*)::int FROM (
      SELECT id FROM public.pet_documents WHERE user_id = p_user_id
      UNION ALL
      SELECT v.id FROM public.vaccinations v JOIN public.pets p ON p.id = v.pet_id
        WHERE p.user_id = p_user_id AND v.document_url IS NOT NULL
      UNION ALL
      SELECT e.id FROM public.clinical_exams e JOIN public.pets p ON p.id = e.pet_id
        WHERE p.user_id = p_user_id AND e.document_url IS NOT NULL
      UNION ALL
      SELECT l.id FROM public.lab_results l JOIN public.pets p ON p.id = l.pet_id
        WHERE p.user_id = p_user_id AND l.document_url IS NOT NULL
      UNION ALL
      SELECT m.id FROM public.medicines m JOIN public.pets p ON p.id = m.pet_id
        WHERE p.user_id = p_user_id AND m.document_url IS NOT NULL
    ) docs
  ), 0);
$$;

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

CREATE OR REPLACE FUNCTION public.increment_milo_conversation_usage (p_user_id uuid)
  RETURNS int
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
  SELECT max_milo_conversations INTO v_max FROM public.subscription_limits WHERE plan = v_plan;
  IF v_max IS NULL THEN
    RETURN 0;
  END IF;
  INSERT INTO public.user_subscription_usage (user_id, milo_conversations_used)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT milo_conversations_used INTO v_used FROM public.user_subscription_usage WHERE user_id = p_user_id FOR UPDATE;
  IF v_used >= v_max THEN
    RAISE EXCEPTION 'Milo conversation limit reached (% lifetime). Upgrade to Individual for unlimited Milo.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.user_subscription_usage
  SET milo_conversations_used = milo_conversations_used + 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING milo_conversations_used INTO v_used;
  RETURN v_used;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ai_journal_usage (p_user_id uuid)
  RETURNS int
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
  SELECT max_ai_journal_entries INTO v_max FROM public.subscription_limits WHERE plan = v_plan;
  IF v_max IS NULL THEN
    RETURN 0;
  END IF;
  INSERT INTO public.user_subscription_usage (user_id, ai_journal_entries_used)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT ai_journal_entries_used INTO v_used FROM public.user_subscription_usage WHERE user_id = p_user_id FOR UPDATE;
  IF v_used >= v_max THEN
    RAISE EXCEPTION 'AI journal entry limit reached (% lifetime). Upgrade to Individual for unlimited entries.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.user_subscription_usage
  SET ai_journal_entries_used = ai_journal_entries_used + 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING ai_journal_entries_used INTO v_used;
  RETURN v_used;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_register_founding_purchase (
  p_user_id uuid,
  p_plan text,
  p_product_id text DEFAULT NULL
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_count int;
BEGIN
  IF p_plan NOT IN ('individual', 'family') THEN
    RAISE EXCEPTION 'Invalid founding plan';
  END IF;
  SELECT purchase_count INTO v_count FROM public.founding_member_counter WHERE id = 1 FOR UPDATE;
  IF v_count >= 500 THEN
    RETURN false;
  END IF;
  INSERT INTO public.founding_member_purchases (user_id, plan, product_id)
  VALUES (p_user_id, p_plan, p_product_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  UPDATE public.founding_member_counter SET purchase_count = purchase_count + 1 WHERE id = 1;
  RETURN true;
END;
$$;

-- Pet limit trigger
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
  SELECT COALESCE(plan, 'free') INTO v_plan FROM public.user_entitlements WHERE user_id = NEW.user_id;
  v_plan := COALESCE(v_plan, 'free');
  SELECT max_pets INTO v_max FROM public.subscription_limits WHERE plan = v_plan;
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*)::int INTO v_count FROM public.pets WHERE user_id = NEW.user_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Pet profile limit reached (%). Upgrade to Family for unlimited pets.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pet_plan_limit_trigger ON public.pets;

CREATE TRIGGER enforce_pet_plan_limit_trigger
  BEFORE INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pet_plan_limit ();

-- Document quota on pet_documents insert
CREATE OR REPLACE FUNCTION public.enforce_document_quota_on_insert ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  PERFORM public.assert_document_quota(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_document_quota_pet_documents ON public.pet_documents;

CREATE TRIGGER enforce_document_quota_pet_documents
  BEFORE INSERT ON public.pet_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_on_insert ();

REVOKE ALL ON FUNCTION public.increment_milo_conversation_usage (uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_ai_journal_usage (uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_document_quota (uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_register_founding_purchase (uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_milo_conversation_usage (uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_ai_journal_usage (uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_document_quota (uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_register_founding_purchase (uuid, text, text) TO service_role;
