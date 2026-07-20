-- Scope household MTCH invite codes to selected pet(s).
-- NULL pet_ids = legacy "all owner pets". Non-null = only those pets get grants on accept.

ALTER TABLE public.household_invites
  ADD COLUMN IF NOT EXISTS pet_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.household_invites.pet_ids IS
  'When set, accept_household_invite_code grants access only to these pets. NULL = all owner pets (legacy).';

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
      AND (
        inv.pet_ids IS NULL
        OR p.id = ANY (inv.pet_ids)
      )
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

COMMENT ON FUNCTION public.accept_household_invite_code(text) IS
  'Invitee accepts MTCH code: household_members + admin grants on invite.pet_ids (or all owner pets when pet_ids is null).';
