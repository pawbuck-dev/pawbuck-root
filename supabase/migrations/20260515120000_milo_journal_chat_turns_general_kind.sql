-- General Milo chat turns: distinguish from journal; allow turns without a selected pet.

ALTER TABLE public.milo_journal_chat_turns
  ADD COLUMN IF NOT EXISTS chat_kind text NOT NULL DEFAULT 'journal';

COMMENT ON COLUMN public.milo_journal_chat_turns.chat_kind IS
  'journal = Pet Journal interview; general = standard Milo chat (feedback correlation).';

ALTER TABLE public.milo_journal_chat_turns
  ALTER COLUMN pet_id DROP NOT NULL;

COMMENT ON COLUMN public.milo_journal_chat_turns.pet_id IS
  'Pet context for the turn; NULL when user chats without a selected pet (general mode only).';

-- RLS: general rows (no pet) visible only to the user who created the turn.
DROP POLICY IF EXISTS milo_journal_chat_turns_select_family_privacy ON public.milo_journal_chat_turns;

CREATE POLICY milo_journal_chat_turns_select_family_privacy
  ON public.milo_journal_chat_turns
  FOR SELECT
  TO authenticated
  USING (
    (pet_id IS NOT NULL AND public.get_user_pet_role(pet_id) IN ('owner', 'admin'))
    OR (
      pet_id IS NOT NULL
      AND public.get_user_pet_role(pet_id) IN ('contributor', 'view_only')
      AND user_id = (SELECT auth.uid())
    )
    OR (pet_id IS NULL AND user_id = (SELECT auth.uid()))
  );

COMMENT ON POLICY milo_journal_chat_turns_select_family_privacy ON public.milo_journal_chat_turns IS
  'Journal: owner/admin see all turns for pet; contributor/view_only own turns. General: own rows when pet_id is null.';
