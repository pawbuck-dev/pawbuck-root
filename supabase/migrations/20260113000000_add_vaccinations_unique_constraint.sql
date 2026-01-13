-- Add unique constraint to prevent duplicate vaccinations
-- A duplicate is defined as same pet_id + name (case-insensitive, trimmed) + date (date part only)

CREATE UNIQUE INDEX IF NOT EXISTS vaccinations_pet_name_date_unique_idx 
ON public.vaccinations (pet_id, lower(trim(name)), ((date AT TIME ZONE 'UTC')::date));

COMMENT ON INDEX public.vaccinations_pet_name_date_unique_idx IS 
'Prevents duplicate vaccinations for the same pet with the same vaccine name and date';
