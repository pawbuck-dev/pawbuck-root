-- Pet profile photos for family sharing (hosted Supabase)
--
-- `supabase db push` cannot create policies on storage.objects (table owned by
-- supabase_storage_admin). Run this once in Supabase Dashboard → SQL Editor after
-- migration 20260712160000_pets_storage_family_read.sql is applied.
--
-- Prerequisite: public.user_can_read_pets_storage_object(text) exists.

DROP POLICY IF EXISTS "pets_storage_select_via_pet_access" ON storage.objects;

CREATE POLICY "pets_storage_select_via_pet_access"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pets'
    AND public.user_can_read_pets_storage_object(name));
