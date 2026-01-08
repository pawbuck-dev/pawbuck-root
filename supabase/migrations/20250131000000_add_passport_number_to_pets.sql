-- Add passport_number column to pets table
ALTER TABLE "public"."pets" 
ADD COLUMN "passport_number" text;

-- Add comment to document the field
COMMENT ON COLUMN "public"."pets"."passport_number" IS 'Official pet passport number (e.g., US-2022-12345). Optional field for international travel documentation.';

