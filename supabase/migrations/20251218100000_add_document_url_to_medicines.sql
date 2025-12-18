-- Add document_url column to medicines table to store the path to the uploaded document
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS document_url text;
