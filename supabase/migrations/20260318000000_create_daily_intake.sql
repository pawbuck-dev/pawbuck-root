CREATE TABLE IF NOT EXISTS public.daily_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  food_intake integer NOT NULL DEFAULT 0,
  water_intake integer NOT NULL DEFAULT 0,
  food_target integer NOT NULL DEFAULT 4,
  water_target integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_intake_pet_user_date_key UNIQUE (pet_id, user_id, date)
);

ALTER TABLE public.daily_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily intake"
ON public.daily_intake FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily intake"
ON public.daily_intake FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily intake"
ON public.daily_intake FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.daily_intake TO authenticated;
