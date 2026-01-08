-- Extend user_preferences table to include pet parent profile information
-- Add full_name, phone, and address fields for the Pet Parent section

ALTER TABLE "public"."user_preferences"
ADD COLUMN IF NOT EXISTS "full_name" text,
ADD COLUMN IF NOT EXISTS "phone" text,
ADD COLUMN IF NOT EXISTS "address" text;

-- Add comments for documentation
COMMENT ON COLUMN "public"."user_preferences"."full_name" IS 'Full name of the pet parent/owner';
COMMENT ON COLUMN "public"."user_preferences"."phone" IS 'Phone number of the pet parent/owner';
COMMENT ON COLUMN "public"."user_preferences"."address" IS 'Address of the pet parent/owner';


