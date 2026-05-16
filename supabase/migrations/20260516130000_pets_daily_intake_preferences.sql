-- Pet-level defaults for body tracker intake (grams per meal, ml per cup, slot counts).
-- When null, the app uses breed/weight heuristics; user overrides persist here for journaling accuracy.

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS intake_meals_per_day integer,
  ADD COLUMN IF NOT EXISTS intake_grams_per_meal integer,
  ADD COLUMN IF NOT EXISTS intake_water_cups_per_day integer,
  ADD COLUMN IF NOT EXISTS intake_water_ml_per_cup integer;

COMMENT ON COLUMN public.pets.intake_meals_per_day IS 'Food meal slots per day (body tracker); null = heuristic/default.';
COMMENT ON COLUMN public.pets.intake_grams_per_meal IS 'Assumed grams per meal for progress copy; null = heuristic.';
COMMENT ON COLUMN public.pets.intake_water_cups_per_day IS 'Water cup slots per day; null = heuristic/default.';
COMMENT ON COLUMN public.pets.intake_water_ml_per_cup IS 'ml assumed per cup icon for totals; null = 250.';
