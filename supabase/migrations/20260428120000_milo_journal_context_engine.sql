-- Contextual journal Milo: admin config, chat turn ids, thumbs feedback

CREATE TABLE IF NOT EXISTS public.milo_journal_config (
  id text PRIMARY KEY DEFAULT 'default',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.milo_journal_config IS 'Tunable thresholds and prompt version for journal-mode Milo (PawBuck.API).';

CREATE TABLE IF NOT EXISTS public.milo_journal_chat_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  prompt_version text NOT NULL DEFAULT 'v1',
  heuristic_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS milo_journal_chat_turns_user_created_idx
  ON public.milo_journal_chat_turns (user_id, created_at DESC);

COMMENT ON TABLE public.milo_journal_chat_turns IS 'Journal Milo assistant turns; id returned to client for feedback correlation.';

CREATE TABLE IF NOT EXISTS public.milo_journal_message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id uuid NOT NULL REFERENCES public.milo_journal_chat_turns (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT milo_journal_message_feedback_turn_id_key UNIQUE (turn_id)
);

CREATE INDEX IF NOT EXISTS milo_journal_message_feedback_created_idx
  ON public.milo_journal_message_feedback (created_at DESC);

COMMENT ON TABLE public.milo_journal_message_feedback IS 'Thumbs up/down on a journal Milo turn.';

INSERT INTO public.milo_journal_config (id, config)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.milo_journal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milo_journal_chat_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milo_journal_message_feedback ENABLE ROW LEVEL SECURITY;

-- API uses service DB role; optional authenticated policies for future direct access
DROP POLICY IF EXISTS "milo_journal_feedback_insert_own" ON public.milo_journal_message_feedback;
CREATE POLICY "milo_journal_feedback_insert_own"
  ON public.milo_journal_message_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "milo_journal_feedback_update_own" ON public.milo_journal_message_feedback;
CREATE POLICY "milo_journal_feedback_update_own"
  ON public.milo_journal_message_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON TABLE public.milo_journal_config TO anon;
GRANT ALL ON TABLE public.milo_journal_config TO authenticated;
GRANT ALL ON TABLE public.milo_journal_config TO service_role;

GRANT ALL ON TABLE public.milo_journal_chat_turns TO anon;
GRANT ALL ON TABLE public.milo_journal_chat_turns TO authenticated;
GRANT ALL ON TABLE public.milo_journal_chat_turns TO service_role;

GRANT ALL ON TABLE public.milo_journal_message_feedback TO anon;
GRANT ALL ON TABLE public.milo_journal_message_feedback TO authenticated;
GRANT ALL ON TABLE public.milo_journal_message_feedback TO service_role;
