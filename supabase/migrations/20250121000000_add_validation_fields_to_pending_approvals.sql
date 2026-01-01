-- Add validation_status and validation_errors fields to pending_email_approvals table
-- This allows tracking emails with incorrect pet information detected by OCR

ALTER TABLE public.pending_email_approvals 
ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'correct', 'incorrect')),
ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS attachment_url text;

-- Add comment explaining the new fields
COMMENT ON COLUMN public.pending_email_approvals.validation_status IS 'Validation status: pending (not yet validated), correct (pet info matches), incorrect (pet info mismatch detected)';
COMMENT ON COLUMN public.pending_email_approvals.validation_errors IS 'JSON object storing validation errors, e.g., {"microchip_number": "Mismatch detected", "pet_name": "Mismatch detected"}';
COMMENT ON COLUMN public.pending_email_approvals.document_type IS 'Type of document in attachment (e.g., "travel_certificate", "vaccination", "lab_result", "exam")';
COMMENT ON COLUMN public.pending_email_approvals.attachment_url IS 'URL to the attachment/document for preview';

-- Create index for faster lookups of incorrect records
CREATE INDEX IF NOT EXISTS idx_pending_email_approvals_validation_status 
ON public.pending_email_approvals(validation_status) 
WHERE validation_status = 'incorrect';


