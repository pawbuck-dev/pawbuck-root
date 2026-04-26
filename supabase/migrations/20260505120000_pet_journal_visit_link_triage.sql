-- Link journal entries to a clinical visit and clear triage from active dashboards.

ALTER TABLE public.pet_journal_entries
  ADD COLUMN IF NOT EXISTS linked_clinical_exam_id uuid REFERENCES public.clinical_exams (id) ON DELETE SET NULL;

ALTER TABLE public.pet_journal_entries
  ADD COLUMN IF NOT EXISTS triage_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.pet_journal_entries
  DROP CONSTRAINT IF EXISTS pet_journal_entries_triage_status_check;

ALTER TABLE public.pet_journal_entries
  ADD CONSTRAINT pet_journal_entries_triage_status_check
  CHECK (triage_status IN ('active', 'resolved'));

COMMENT ON COLUMN public.pet_journal_entries.linked_clinical_exam_id IS
  'When set, this journal row is associated with a recorded clinical visit (post-visit clearance).';

COMMENT ON COLUMN public.pet_journal_entries.triage_status IS
  'active = may surface in triage/flags; resolved = cleared (e.g. linked to a clinical visit).';

CREATE INDEX IF NOT EXISTS pet_journal_entries_pet_triage_idx
  ON public.pet_journal_entries (pet_id, triage_status)
  WHERE vet_flagged = true AND domain = 'health';

CREATE OR REPLACE FUNCTION public.pet_journal_clear_triage_on_clinical_link ()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.linked_clinical_exam_id IS NOT NULL THEN
    NEW.triage_status := 'resolved';
    NEW.vet_flagged := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pet_journal_clear_triage_on_clinical_link ON public.pet_journal_entries;
CREATE TRIGGER trg_pet_journal_clear_triage_on_clinical_link
  BEFORE INSERT OR UPDATE OF linked_clinical_exam_id ON public.pet_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.pet_journal_clear_triage_on_clinical_link ();
