-- Family / household grantees could read `pets.photo_url` from Postgres but not sign storage
-- objects: profile paths live under `{owner_user_id}/pet_{name}_{pet_id}/...` while RLS only
-- allowed the folder owner.
--
-- Creates helper function only. Storage policy must be applied separately (hosted Supabase
-- owns storage.objects — see supabase/manual-seeds/pets_storage_family_read_policy.sql).

INSERT INTO storage.buckets (id, name, public)
VALUES ('pets', 'pets', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.user_can_read_pets_storage_object(p_path text)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_first_segment text;
  v_pet_id uuid;
  v_match text[];
BEGIN
  IF p_path IS NULL OR btrim(p_path) = '' THEN
    RETURN false;
  END IF;

  v_first_segment := split_part(p_path, '/', 1);

  IF v_first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND v_first_segment::uuid = auth.uid() THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.pets p
    WHERE
      p.deleted_at IS NULL
      AND p.photo_url = p_path
      AND public.user_can_access_pet(p.id)) THEN
    RETURN true;
  END IF;

  v_match := regexp_match(p_path, '/pet_[^/]+_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/', 'i');
  IF v_match IS NOT NULL THEN
    BEGIN
      v_pet_id := v_match[1]::uuid;
      IF public.user_can_access_pet(v_pet_id) THEN
        RETURN true;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  IF v_first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      v_pet_id := v_first_segment::uuid;
      IF public.user_can_access_pet(v_pet_id) THEN
        RETURN true;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.user_can_read_pets_storage_object (text) IS
  'True when auth.uid() may read an object in the pets storage bucket (owner folder or shared pet access).';

REVOKE ALL ON FUNCTION public.user_can_read_pets_storage_object (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_read_pets_storage_object (text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_read_pets_storage_object (text) TO service_role;
