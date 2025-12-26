-- Add unique constraint on s3_key to prevent duplicate pending approvals for the same email
-- This prevents issues when AWS SES/Lambda retries or duplicate triggers occur

ALTER TABLE public.pending_email_approvals 
ADD CONSTRAINT unique_pending_email_s3_key UNIQUE (s3_key);

