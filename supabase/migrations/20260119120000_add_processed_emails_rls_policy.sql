-- Add RLS policy for processed_emails table
-- This allows authenticated users to view processed_emails for their own pets

-- Allow users to select processed_emails for their own pets
CREATE POLICY "Users can view processed_emails for their pets"
ON processed_emails
FOR SELECT
TO authenticated
USING (
  pet_id IN (
    SELECT id FROM pets WHERE user_id = auth.uid()
  )
);
