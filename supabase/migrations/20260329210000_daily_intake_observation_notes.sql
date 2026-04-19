-- Optional note + photo when tagging abnormal stool/urine observations on daily_intake.

ALTER TABLE public.daily_intake
  ADD COLUMN IF NOT EXISTS poop_observation_note text,
  ADD COLUMN IF NOT EXISTS poop_observation_photo_path text,
  ADD COLUMN IF NOT EXISTS pee_observation_note text,
  ADD COLUMN IF NOT EXISTS pee_observation_photo_path text;

COMMENT ON COLUMN public.daily_intake.poop_observation_note IS 'Free text when Mucus, Blood, or Unusual color is selected for stool.';
COMMENT ON COLUMN public.daily_intake.poop_observation_photo_path IS 'Supabase storage path in bucket pets for stool observation photo.';
COMMENT ON COLUMN public.daily_intake.pee_observation_note IS 'Free text when Unusual color is selected for urine.';
COMMENT ON COLUMN public.daily_intake.pee_observation_photo_path IS 'Supabase storage path in bucket pets for urine observation photo.';
