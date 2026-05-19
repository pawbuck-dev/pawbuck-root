-- Optional thumbs-down reason for journal Milo feedback (v1.5 §11).

ALTER TABLE public.milo_journal_message_feedback
  ADD COLUMN IF NOT EXISTS feedback_reason text,
  ADD COLUMN IF NOT EXISTS tree_version text,
  ADD COLUMN IF NOT EXISTS questions_asked int,
  ADD COLUMN IF NOT EXISTS feedback_stage text;

COMMENT ON COLUMN public.milo_journal_message_feedback.feedback_reason IS
  'Owner-selected reason chip when rating is down.';
