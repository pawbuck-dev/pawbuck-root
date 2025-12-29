-- Update check_email_id_available function to include deleted pets
-- This ensures email_ids remain unique even after a pet is deleted
CREATE OR REPLACE FUNCTION check_email_id_available(p_email_id text, p_exclude_pet_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.pets 
    WHERE lower(email_id) = lower(p_email_id)
    AND (p_exclude_pet_id IS NULL OR id != p_exclude_pet_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

