-- Review Inbox: semantic status for items that need user resolution (not "failed" framing)
ALTER TABLE public.processed_emails
  ADD COLUMN IF NOT EXISTS review_status text
  CHECK (
    review_status IS NULL
    OR review_status IN ('pending', 'resolved', 'dismissed')
  );

COMMENT ON COLUMN public.processed_emails.review_status IS
  'Inbox triage: pending = needs user review/resolve; resolved/dismissed = cleared from queue.';

-- Backfill existing failed completions as pending review
UPDATE public.processed_emails
SET review_status = 'pending'
WHERE success = false
  AND status = 'completed'
  AND (review_status IS NULL);

CREATE INDEX IF NOT EXISTS processed_emails_review_status_idx
  ON public.processed_emails (review_status)
  WHERE review_status = 'pending';
