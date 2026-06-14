-- Body tracker: daily output (poop/pee) on daily_intake; weight history in pet_weight_logs; optional target on pets.

CREATE TABLE IF NOT EXISTS public.daily_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL DEFAULT (CURRENT_DATE),
  food_intake integer NOT NULL DEFAULT 0,
  water_intake integer NOT NULL DEFAULT 0,
  food_target integer NOT NULL DEFAULT 4,
  water_target integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_intake_pet_user_date_key UNIQUE (pet_id, user_id, date)
);

ALTER TABLE public.daily_intake ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_intake' AND policyname = 'Users can view their own daily intake'
  ) THEN
    CREATE POLICY "Users can view their own daily intake"
    ON public.daily_intake FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_intake' AND policyname = 'Users can insert their own daily intake'
  ) THEN
    CREATE POLICY "Users can insert their own daily intake"
    ON public.daily_intake FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_intake' AND policyname = 'Users can update their own daily intake'
  ) THEN
    CREATE POLICY "Users can update their own daily intake"
    ON public.daily_intake FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.daily_intake TO authenticated;

ALTER TABLE public.daily_intake
  ADD COLUMN IF NOT EXISTS poop_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pee_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS poop_target integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS pee_target integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS poop_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pee_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS poop_observation_note text,
  ADD COLUMN IF NOT EXISTS poop_observation_photo_path text,
  ADD COLUMN IF NOT EXISTS pee_observation_note text,
  ADD COLUMN IF NOT EXISTS pee_observation_photo_path text;

COMMENT ON COLUMN public.daily_intake.poop_observation_note IS 'Free text when Mucus, Blood, or Unusual color is selected for stool.';
COMMENT ON COLUMN public.daily_intake.poop_observation_photo_path IS 'Supabase storage path in bucket pets for stool observation photo.';
COMMENT ON COLUMN public.daily_intake.pee_observation_note IS 'Free text when Unusual color is selected for urine.';
COMMENT ON COLUMN public.daily_intake.pee_observation_photo_path IS 'Supabase storage path in bucket pets for urine observation photo.';

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS target_weight_value double precision,
  ADD COLUMN IF NOT EXISTS target_weight_unit text;

CREATE TABLE IF NOT EXISTS public.pet_weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  weight_value double precision NOT NULL,
  weight_unit text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_weight_logs_unit_check CHECK (weight_unit IN ('lbs', 'kg'))
);

CREATE INDEX IF NOT EXISTS pet_weight_logs_pet_recorded_idx
  ON public.pet_weight_logs (pet_id, recorded_at DESC);

ALTER TABLE public.pet_weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pets weight logs"
ON public.pet_weight_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = pet_weight_logs.pet_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert weight logs for their pets"
ON public.pet_weight_logs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = pet_weight_logs.pet_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their pets weight logs"
ON public.pet_weight_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = pet_weight_logs.pet_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their pets weight logs"
ON public.pet_weight_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = pet_weight_logs.pet_id AND p.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_weight_logs TO authenticated;
