-- Phase D: care nudge dismissals + proactive vaccine push preference.

CREATE TABLE IF NOT EXISTS public.care_nudge_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  nudge_kind text NOT NULL,
  dismissed_until date,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, pet_id, nudge_kind)
);

CREATE INDEX IF NOT EXISTS care_nudge_dismissals_user_idx
  ON public.care_nudge_dismissals (user_id);

ALTER TABLE public.care_nudge_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_nudge_dismissals_owner_all
  ON public.care_nudge_dismissals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.care_nudge_dismissals IS 'Owner snooze/dismiss for in-app and push care nudges per pet+kind.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.care_nudge_dismissals TO authenticated;
GRANT ALL ON TABLE public.care_nudge_dismissals TO service_role;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS proactive_vaccine_push_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_preferences.proactive_vaccine_push_enabled IS
  'Server push for overdue/missing vaccine care nudges (digest). Default on.';
