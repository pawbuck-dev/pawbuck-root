-- Create processed_emails table for idempotency checking
-- This prevents duplicate processing when AWS SNS delivers the same email multiple times

CREATE TABLE public.processed_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  s3_key text NOT NULL UNIQUE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing', -- 'processing' or 'completed'
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  attachment_count integer DEFAULT 0,
  success boolean DEFAULT true
);

-- Index for fast lookups by s3_key
CREATE INDEX processed_emails_s3_key_idx ON public.processed_emails(s3_key);

-- Index for querying by pet
CREATE INDEX processed_emails_pet_id_idx ON public.processed_emails(pet_id);

-- Enable RLS
ALTER TABLE public.processed_emails ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service_role (used by edge functions)
GRANT ALL ON TABLE public.processed_emails TO service_role;

