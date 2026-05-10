-- Milo triage journal dedupe: one persisted row per pet + triage fingerprint + subtype.
ALTER TABLE public.pet_journal_entries
  ADD COLUMN IF NOT EXISTS milo_idempotency_key text;

COMMENT ON COLUMN public.pet_journal_entries.milo_idempotency_key IS
  'Client-computed key (domain + subtype + content hash) so duplicate triage completes do not insert twice.';

CREATE UNIQUE INDEX IF NOT EXISTS pet_journal_entries_pet_milo_idem_uidx
  ON public.pet_journal_entries (pet_id, milo_idempotency_key)
  WHERE milo_idempotency_key IS NOT NULL;
