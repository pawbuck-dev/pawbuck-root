-- Add unique constraint to prevent duplicate medications
-- A duplicate is defined as same pet_id + name (case-insensitive, trimmed) + start_date (date part only)
-- Note: For medications with NULL start_date, we use COALESCE to treat them as '1970-01-01' for uniqueness

CREATE UNIQUE INDEX IF NOT EXISTS medicines_pet_name_start_date_unique_idx 
ON public.medicines (pet_id, lower(trim(name)), COALESCE((start_date AT TIME ZONE 'UTC')::date, '1970-01-01'::date));

COMMENT ON INDEX public.medicines_pet_name_start_date_unique_idx IS 
'Prevents duplicate medications for the same pet with the same medication name and start date';
