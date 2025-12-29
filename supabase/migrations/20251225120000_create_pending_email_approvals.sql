-- Create pending_email_approvals table for storing emails that require user confirmation
CREATE TABLE public.pending_email_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  sender_email text NOT NULL,
  s3_bucket text NOT NULL,
  s3_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' -- 'pending', 'approved', 'rejected'
);

-- Enable Row Level Security
ALTER TABLE public.pending_email_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy for SELECT: Users can view their own pending approvals
CREATE POLICY "Users can view their own pending approvals"
ON public.pending_email_approvals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for INSERT: Service role only (from edge functions)
-- Authenticated users cannot insert directly
CREATE POLICY "Service role can insert pending approvals"
ON public.pending_email_approvals
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy for UPDATE: Users can update their own pending approvals (to approve/reject)
CREATE POLICY "Users can update their own pending approvals"
ON public.pending_email_approvals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own pending approvals
CREATE POLICY "Users can delete their own pending approvals"
ON public.pending_email_approvals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON public.pending_email_approvals TO authenticated;
GRANT ALL ON public.pending_email_approvals TO service_role;

-- Create index for faster lookups
CREATE INDEX idx_pending_email_approvals_pet_id ON public.pending_email_approvals(pet_id);
CREATE INDEX idx_pending_email_approvals_user_id ON public.pending_email_approvals(user_id);
CREATE INDEX idx_pending_email_approvals_status ON public.pending_email_approvals(status);

