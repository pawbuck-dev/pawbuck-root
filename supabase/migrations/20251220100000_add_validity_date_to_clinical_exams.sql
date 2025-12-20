-- Add validity_date column to clinical_exams table for travel documents
-- This column is nullable as only travel documents will have a validity date

ALTER TABLE clinical_exams ADD COLUMN validity_date DATE;

-- Add comment explaining the column purpose
COMMENT ON COLUMN clinical_exams.validity_date IS 'Validity/expiry date for travel documents. NULL for other exam types.';
