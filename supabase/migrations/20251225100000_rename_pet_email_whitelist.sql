-- Rename pet_email_whitelist to pet_email_list and add is_blocked column
ALTER TABLE "public"."pet_email_whitelist" RENAME TO "pet_email_list";

-- Add is_blocked column to distinguish between whitelist and blocklist entries
ALTER TABLE "public"."pet_email_list" ADD COLUMN "is_blocked" boolean NOT NULL DEFAULT false;
