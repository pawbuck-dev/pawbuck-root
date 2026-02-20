-- Remove vet_information_id column from pets table
-- The app now uses pet_care_team_members junction table exclusively
-- for linking pets to care team members (vets, groomers, etc.)

-- Drop the foreign key constraint first
ALTER TABLE "public"."pets" 
DROP CONSTRAINT IF EXISTS "pets_vet_information_id_fkey";

-- Drop the index
DROP INDEX IF EXISTS "public"."idx_pets_vet_information_id";

-- Drop the column
ALTER TABLE "public"."pets" 
DROP COLUMN IF EXISTS "vet_information_id";
