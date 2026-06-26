-- Milo quality ledger: structured outcomes for admin observability (no full chat text).

CREATE TABLE IF NOT EXISTS public.milo_interaction_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets (id) ON DELETE SET NULL,
  turn_id uuid REFERENCES public.milo_journal_chat_turns (id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.pet_documents (id) ON DELETE SET NULL,
  surface text NOT NULL CHECK (surface IN ('chat', 'journal', 'vision', 'email_vault')),
  outcome text NOT NULL CHECK (outcome IN ('success', 'partial', 'failed')),
  failure_code text,
  intent_tags text[] NOT NULL DEFAULT '{}',
  used_rag boolean NOT NULL DEFAULT false,
  used_curated boolean NOT NULL DEFAULT false,
  used_pet_facts boolean NOT NULL DEFAULT false,
  journal_emergency_stop boolean NOT NULL DEFAULT false,
  document_type text,
  confidence numeric,
  model_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS milo_interaction_outcomes_created_idx
  ON public.milo_interaction_outcomes (created_at DESC);

CREATE INDEX IF NOT EXISTS milo_interaction_outcomes_pet_created_idx
  ON public.milo_interaction_outcomes (pet_id, created_at DESC)
  WHERE pet_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS milo_interaction_outcomes_failure_idx
  ON public.milo_interaction_outcomes (failure_code, created_at DESC)
  WHERE failure_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS milo_interaction_outcomes_surface_outcome_idx
  ON public.milo_interaction_outcomes (surface, outcome, created_at DESC);

COMMENT ON TABLE public.milo_interaction_outcomes IS
  'Milo AI quality outcomes for admin support (flags + failure codes; no user message text). Written by PawBuck.API service role.';

ALTER TABLE public.milo_interaction_outcomes ENABLE ROW LEVEL SECURITY;

-- No authenticated policies: admin reads via PawBuck.API /api/support/* only.

GRANT ALL ON TABLE public.milo_interaction_outcomes TO service_role;
