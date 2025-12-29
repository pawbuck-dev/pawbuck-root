-- Add unique constraint on (pet_id, email_id) to prevent duplicate safe sender emails
-- This ensures a pet cannot have the same email added multiple times
CREATE UNIQUE INDEX IF NOT EXISTS pet_email_list_pet_id_email_id_key 
ON public.pet_email_list (pet_id, email_id);

