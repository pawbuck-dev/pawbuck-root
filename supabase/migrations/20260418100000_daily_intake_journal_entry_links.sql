-- Link Body Tracker elimination observations to pet_journal_entries for Pet Journal / briefing.

ALTER TABLE public.daily_intake
  ADD COLUMN IF NOT EXISTS poop_journal_entry_id uuid REFERENCES public.pet_journal_entries (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pee_journal_entry_id uuid REFERENCES public.pet_journal_entries (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS daily_intake_poop_journal_idx
  ON public.daily_intake (poop_journal_entry_id)
  WHERE poop_journal_entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS daily_intake_pee_journal_idx
  ON public.daily_intake (pee_journal_entry_id)
  WHERE pee_journal_entry_id IS NOT NULL;

COMMENT ON COLUMN public.daily_intake.poop_journal_entry_id IS 'Synced Pet Journal row for stool observation (concern tags).';
COMMENT ON COLUMN public.daily_intake.pee_journal_entry_id IS 'Synced Pet Journal row for urine observation (concern tags).';
