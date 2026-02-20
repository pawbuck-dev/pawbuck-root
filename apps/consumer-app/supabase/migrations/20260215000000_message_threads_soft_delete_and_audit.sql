-- Mail delete: soft delete (Trash) and audit trail for compliance.
-- Deleted emails move to Trash (soft delete); permanent delete after 30 days is handled by a scheduled function.
-- Health records (vaccinations, medications, etc.) are in separate tables and are NOT deleted.

-- 1. Add soft-delete columns to message_threads
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.message_threads.deleted_at IS 'When the thread was moved to Trash (soft delete). NULL = in inbox.';
COMMENT ON COLUMN public.message_threads.deleted_by IS 'User who moved the thread to Trash (audit).';

CREATE INDEX IF NOT EXISTS idx_message_threads_deleted_at
  ON public.message_threads (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 2. Audit table for compliance: who deleted/restored/permanently deleted
CREATE TABLE IF NOT EXISTS public.email_delete_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('deleted', 'restored', 'permanently_deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_delete_audit IS 'Audit trail for email/thread delete and restore for compliance.';

CREATE INDEX IF NOT EXISTS idx_email_delete_audit_thread_id ON public.email_delete_audit (thread_id);
CREATE INDEX IF NOT EXISTS idx_email_delete_audit_created_at ON public.email_delete_audit (created_at);

ALTER TABLE public.email_delete_audit ENABLE ROW LEVEL SECURITY;

-- Only the owning user can read their audit rows (thread belongs to user via message_threads)
CREATE POLICY "Users can view their own email delete audit"
  ON public.email_delete_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = email_delete_audit.thread_id AND mt.user_id = auth.uid()
    )
  );

-- Service role and backend can insert (e.g. purge cron inserts permanently_deleted)
CREATE POLICY "Users can insert audit for their threads"
  ON public.email_delete_audit FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_id AND mt.user_id = auth.uid()
    )
  );

-- Allow service_role to insert audit for permanently_deleted (cron runs as service_role)
CREATE POLICY "Service role can insert email delete audit"
  ON public.email_delete_audit FOR INSERT
  TO service_role
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.email_delete_audit TO authenticated;
GRANT ALL ON public.email_delete_audit TO service_role;
