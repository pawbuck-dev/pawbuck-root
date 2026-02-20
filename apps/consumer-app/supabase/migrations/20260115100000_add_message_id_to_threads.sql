-- Add message_id column to message_threads table
-- This stores the email Message-Id header for proper email threading support
-- The message_id is updated on every new inbound message to track the latest message

ALTER TABLE message_threads ADD COLUMN message_id TEXT;

-- Add a comment to the column for documentation
COMMENT ON COLUMN message_threads.message_id IS 'Email Message-Id header from the latest inbound message for threading support';
