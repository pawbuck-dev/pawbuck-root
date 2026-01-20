-- Add columns to processed_emails table to store email metadata for failed email display
-- These columns allow the frontend to show meaningful information about failed emails

ALTER TABLE processed_emails
ADD COLUMN IF NOT EXISTS sender_email text,
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS failure_reason text;

-- Add index on success column for efficient querying of failed emails
CREATE INDEX IF NOT EXISTS processed_emails_success_idx ON processed_emails (success) WHERE success = false;

-- Add comment explaining the columns
COMMENT ON COLUMN processed_emails.sender_email IS 'Email address of the sender for display purposes';
COMMENT ON COLUMN processed_emails.subject IS 'Subject line of the email';
COMMENT ON COLUMN processed_emails.document_type IS 'Type of document detected (vaccination, lab_result, exam, etc.)';
COMMENT ON COLUMN processed_emails.failure_reason IS 'Reason for processing failure (only populated when success=false)';
