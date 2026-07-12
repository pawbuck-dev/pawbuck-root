-- Family grantees could not read pet_care_team_members (owner-only SELECT policy).
-- Widen to anyone with pet access via user_can_access_pet (owner + household grants).

DROP POLICY IF EXISTS "Users can view care team members for their pets" ON public.pet_care_team_members;

CREATE POLICY "Users can view care team members for their pets"
  ON public.pet_care_team_members
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_pet(pet_id));

COMMENT ON POLICY "Users can view care team members for their pets" ON public.pet_care_team_members IS
  'Owner and household/family grantees can view vet and care-team links for shared pets.';
