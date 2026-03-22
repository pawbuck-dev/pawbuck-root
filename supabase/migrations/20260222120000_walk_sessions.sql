-- Pawthon: GPS walk sessions per user + pet (foreground tracking MVP).

CREATE TABLE IF NOT EXISTS public.walk_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  distance_meters numeric NOT NULL DEFAULT 0 CHECK (distance_meters >= 0),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  /** Sampled GPS points: [{ "lat": number, "lng": number, "t": number }] — optional, capped client-side */
  points jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS walk_sessions_user_started_idx
  ON public.walk_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS walk_sessions_pet_started_idx
  ON public.walk_sessions (pet_id, started_at DESC);

COMMENT ON TABLE public.walk_sessions IS 'Pawthon dog walks: distance/duration from in-app GPS tracking.';

ALTER TABLE public.walk_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "walk_sessions_select_own"
  ON public.walk_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = walk_sessions.pet_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "walk_sessions_insert_own"
  ON public.walk_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = walk_sessions.pet_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "walk_sessions_update_own"
  ON public.walk_sessions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = walk_sessions.pet_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = walk_sessions.pet_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "walk_sessions_delete_own"
  ON public.walk_sessions
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = walk_sessions.pet_id AND p.user_id = auth.uid()
    )
  );

GRANT ALL ON TABLE public.walk_sessions TO authenticated;
GRANT ALL ON TABLE public.walk_sessions TO service_role;
