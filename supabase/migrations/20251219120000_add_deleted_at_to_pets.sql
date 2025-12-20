-- Add soft delete column to pets table
ALTER TABLE "public"."pets" ADD COLUMN "deleted_at" timestamptz DEFAULT NULL;

-- Create index for filtering non-deleted pets
CREATE INDEX IF NOT EXISTS pets_deleted_at_idx ON public.pets USING btree (deleted_at);
