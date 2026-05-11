-- Pet behavior baseline (owner-provided "what is normal for this pet" snapshot).
-- Mitigation: additive new table; one row per pet (UNIQUE pet_id); RLS mirrors pet_journal_entries
--   so household / family-grant members can read but only writers (owner / admin / contributor)
--   can mutate; pet ownership transfer carries the row via pet_id (no schema change needed —
--   future product story may prompt the new owner to review or reset baseline).
-- Rollback: forward-only; drop table in a follow-up if needed.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pet_behavior_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

  -- Energy: 1 (very low) .. 5 (very high) cruising speed.
  energy_level_1_to_5 smallint NOT NULL
    CHECK (energy_level_1_to_5 BETWEEN 1 AND 5),
  energy_notes text,

  -- Social disposition with people / other pets.
  social_disposition text NOT NULL
    CHECK (social_disposition = ANY (ARRAY[
      'social_butterfly'::text,
      'indifferent'::text,
      'selective'::text
    ])),

  -- Food / dietary drive.
  food_motivation text NOT NULL
    CHECK (food_motivation = ANY (ARRAY[
      'high'::text,
      'normal'::text,
      'finicky'::text
    ])),

  -- Sleep profile (all nullable; owners may not know on first pass).
  typical_deep_sleep_hours numeric(4, 1)
    CHECK (typical_deep_sleep_hours IS NULL
      OR (typical_deep_sleep_hours >= 0 AND typical_deep_sleep_hours <= 24)),
  sleep_restfulness text
    CHECK (sleep_restfulness IS NULL OR sleep_restfulness = ANY (ARRAY[
      'restful'::text,
      'restless'::text,
      'mixed'::text
    ])),
  sleep_safe_spot text,

  -- Vocalization / talkativeness.
  vocalization_level text NOT NULL
    CHECK (vocalization_level = ANY (ARRAY[
      'quiet'::text,
      'occasional_alerts'::text,
      'very_talkative'::text
    ])),
  vocalization_triggers text[] NOT NULL DEFAULT '{}'::text[],

  -- Stress / reactivity: top-3 mood changers (app caps to 3).
  stress_triggers text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (cardinality(stress_triggers) <= 3),

  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT pet_behavior_baselines_pet_id_key UNIQUE (pet_id)
);

CREATE INDEX IF NOT EXISTS pet_behavior_baselines_pet_id_idx
  ON public.pet_behavior_baselines (pet_id);

COMMENT ON TABLE public.pet_behavior_baselines IS
  'Owner-provided behavior baseline ("normal for this pet"): energy, social, food, sleep, vocalization, stress. One row per pet. Read at journal time so Milo/briefing can contrast today against usual.';

CREATE TRIGGER handle_pet_behavior_baselines_updated_at
  BEFORE UPDATE ON public.pet_behavior_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — mirror pet_journal_entries (household / family-grant access; writers can mutate)
-- ---------------------------------------------------------------------------
ALTER TABLE public.pet_behavior_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_behavior_baselines_select_accessible
  ON public.pet_behavior_baselines
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY pet_behavior_baselines_insert_accessible
  ON public.pet_behavior_baselines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_write_pet_health(pet_id)
  );

CREATE POLICY pet_behavior_baselines_update_health
  ON public.pet_behavior_baselines
  FOR UPDATE
  TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

CREATE POLICY pet_behavior_baselines_delete_health
  ON public.pet_behavior_baselines
  FOR DELETE
  TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_behavior_baselines TO authenticated;
GRANT ALL ON public.pet_behavior_baselines TO service_role;
