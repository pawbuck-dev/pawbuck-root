-- US-FS-010: Journal Milo chat turns — owners/admins see all turns for the pet;
-- contributors and view_only see only their own turns (user_id = auth.uid()).

DROP POLICY IF EXISTS milo_journal_chat_turns_select_owner_admin ON public.milo_journal_chat_turns;

CREATE POLICY milo_journal_chat_turns_select_family_privacy
  ON public.milo_journal_chat_turns
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    OR (
      public.get_user_pet_role(pet_id) IN ('contributor', 'view_only')
      AND user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY milo_journal_chat_turns_select_family_privacy ON public.milo_journal_chat_turns IS
  'US-FS-010: full history for owner/admin; contributors/viewers only their own threads.';
