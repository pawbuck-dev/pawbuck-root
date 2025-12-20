-- Add email_id column to pets table (initially nullable for migration)
ALTER TABLE "public"."pets" 
ADD COLUMN "email_id" text;

-- Generate unique email_ids for existing pets using their name and a random suffix
UPDATE "public"."pets"
SET email_id = lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) || '_' || substring(id::text, 1, 8)
WHERE email_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "public"."pets" 
ALTER COLUMN "email_id" SET NOT NULL;

-- Create partial unique index for fast availability lookups
-- Only enforces uniqueness for non-deleted pets
CREATE UNIQUE INDEX IF NOT EXISTS pets_email_id_unique_idx 
ON public.pets (lower(email_id)) 
WHERE deleted_at IS NULL;

-- Create a function to check email availability
CREATE OR REPLACE FUNCTION check_email_id_available(p_email_id text, p_exclude_pet_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.pets 
    WHERE lower(email_id) = lower(p_email_id)
    AND deleted_at IS NULL
    AND (p_exclude_pet_id IS NULL OR id != p_exclude_pet_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_email_id_available(text, uuid) TO authenticated;
