-- Household MTCH invite accept + member revoke (SECURITY DEFINER trusted writes).
-- Fixes client-side RLS failure on household_invites UPDATE and household_members INSERT.
-- Creates pet_family_grants (admin) for all owner pets so get_user_pet_role grants visibility.

-- ---------------------------------------------------------------------------
-- accept_household_invite_code: invitee accepts MTCH code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_household_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.household_invites%ROWTYPE;
  v_uid uuid := auth.uid();
  v_owner_id uuid;
  v_pets_granted int := 0;
  v_already_member boolean := false;
  pet_rec record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SET LOCAL row_security = off;

  SELECT *
  INTO inv
  FROM public.household_invites
  WHERE upper(btrim(code)) = upper(btrim(p_code))
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at <= timezone('utc', now()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF inv.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  v_owner_id := inv.created_by;

  IF v_owner_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_join');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.user_id = v_uid
      AND hm.household_owner_id = v_owner_id
      AND hm.is_active = true
  ) THEN
    v_already_member := true;
  ELSE
    INSERT INTO public.household_members (user_id, household_owner_id, is_active)
    VALUES (v_uid, v_owner_id, true);
  END IF;

  FOR pet_rec IN
    SELECT p.id AS pet_id
    FROM public.pets p
    WHERE p.user_id = v_owner_id
      AND p.deleted_at IS NULL
  LOOP
    INSERT INTO public.pet_family_grants (pet_id, grantee_id, role, invited_by)
    VALUES (pet_rec.pet_id, v_uid, 'admin', v_owner_id)
    ON CONFLICT (pet_id, grantee_id) DO UPDATE
      SET role = EXCLUDED.role,
          invited_by = EXCLUDED.invited_by;
    v_pets_granted := v_pets_granted + 1;
  END LOOP;

  IF NOT v_already_member OR inv.used_at IS NULL THEN
    UPDATE public.household_invites
    SET used_at = timezone('utc', now()),
        used_by = v_uid,
        is_active = false
    WHERE id = inv.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'owner_id', v_owner_id,
    'pets_granted', v_pets_granted,
    'already_member', v_already_member
  );
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%member limit%' OR SQLERRM LIKE '%Pet family member limit%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'member_limit');
    END IF;
    RAISE;
END;
$$;

ALTER FUNCTION public.accept_household_invite_code(text) OWNER TO postgres;
COMMENT ON FUNCTION public.accept_household_invite_code(text) IS
  'Invitee accepts MTCH household code: marks invite used, adds household_members, grants admin on all owner pets.';

REVOKE ALL ON FUNCTION public.accept_household_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_household_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_household_invite_code(text) TO service_role;

-- ---------------------------------------------------------------------------
-- revoke_household_member_access: owner removes member + pet grants
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_household_member_access(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  mem public.household_members%ROWTYPE;
  v_revoked int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  SET LOCAL row_security = off;

  SELECT *
  INTO mem
  FROM public.household_members
  WHERE id = p_member_id
    AND household_owner_id = v_uid
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  UPDATE public.household_members
  SET is_active = false
  WHERE id = mem.id;

  DELETE FROM public.pet_family_grants g
  USING public.pets p
  WHERE g.grantee_id = mem.user_id
    AND g.pet_id = p.id
    AND p.user_id = v_uid
    AND p.deleted_at IS NULL;

  GET DIAGNOSTICS v_revoked = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'grants_revoked', v_revoked);
END;
$$;

ALTER FUNCTION public.revoke_household_member_access(uuid) OWNER TO postgres;
COMMENT ON FUNCTION public.revoke_household_member_access(uuid) IS
  'Owner deactivates household member and removes pet_family_grants on their pets.';

REVOKE ALL ON FUNCTION public.revoke_household_member_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_household_member_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_household_member_access(uuid) TO service_role;

-- Optional backfill: active household members missing grants on owner pets
INSERT INTO public.pet_family_grants (pet_id, grantee_id, role, invited_by)
SELECT p.id, hm.user_id, 'admin'::public.pet_role, hm.household_owner_id
FROM public.household_members hm
JOIN public.pets p ON p.user_id = hm.household_owner_id AND p.deleted_at IS NULL
WHERE hm.is_active = true
ON CONFLICT (pet_id, grantee_id) DO NOTHING;
