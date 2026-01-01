-- Extend vet_information table to support different care team member types
-- Add type field to distinguish between veterinarians, dog walkers, groomers, pet sitters, and boarding facilities

-- Add type column to vet_information
ALTER TABLE "public"."vet_information" 
ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'veterinarian' CHECK (type IN ('veterinarian', 'dog_walker', 'groomer', 'pet_sitter', 'boarding'));

-- Add comment explaining the type field
COMMENT ON COLUMN "public"."vet_information"."type" IS 'Type of care team member: veterinarian, dog_walker, groomer, pet_sitter, or boarding';

-- Create index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_vet_information_type ON public.vet_information(type);

-- Create junction table for many-to-many relationship between pets and care team members
-- This allows sharing care team members across multiple pets
CREATE TABLE IF NOT EXISTS "public"."pet_care_team_members" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pet_id" uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  "care_team_member_id" uuid NOT NULL REFERENCES public.vet_information(id) ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (id),
  -- Ensure unique combination of pet and care team member
  UNIQUE(pet_id, care_team_member_id)
);

-- Enable Row Level Security
ALTER TABLE "public"."pet_care_team_members" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pet_care_team_members
-- Users can only see care team members linked to their own pets
CREATE POLICY "Users can view care team members for their pets"
ON public.pet_care_team_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_care_team_members.pet_id
    AND pets.user_id = auth.uid()
  )
);

-- Users can link care team members to their own pets
CREATE POLICY "Users can link care team members to their pets"
ON public.pet_care_team_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_care_team_members.pet_id
    AND pets.user_id = auth.uid()
  )
);

-- Users can unlink care team members from their own pets
CREATE POLICY "Users can unlink care team members from their pets"
ON public.pet_care_team_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_care_team_members.pet_id
    AND pets.user_id = auth.uid()
  )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pet_care_team_members_pet_id ON public.pet_care_team_members(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_care_team_members_care_team_member_id ON public.pet_care_team_members(care_team_member_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.pet_care_team_members TO authenticated;

-- Migrate existing vet_information records to have type 'veterinarian'
UPDATE public.vet_information SET type = 'veterinarian' WHERE type IS NULL;

-- Note: The existing vet_information_id column in pets table will remain for backward compatibility
-- New care team members (non-veterinarians) should use the pet_care_team_members junction table


