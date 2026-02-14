-- Create storage bucket for pending email approvals (Mailgun)
-- This bucket stores the parsed email data for re-processing after user approval

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pending-emails',
  'pending-emails',
  false,
  52428800, -- 50MB
  ARRAY['application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their pending emails (via service role)
-- Note: The edge function uses service role key, so no RLS policies needed for it
-- But we add policies in case we need client-side access in the future

-- Policy to allow service role to manage all files
CREATE POLICY "Service role can manage pending emails"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'pending-emails')
WITH CHECK (bucket_id = 'pending-emails');
