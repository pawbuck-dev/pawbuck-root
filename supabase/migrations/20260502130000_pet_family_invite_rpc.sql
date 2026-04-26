-- RPCs for family invite acceptance and slot counting (Edge + app).
-- Clients should keep invite token through sign-up (e.g. query param → post-auth call).

-- ---------------------------------------------------------------------------
-- Slot count for owner/admin only (SECURITY DEFINER; uses auth.uid())
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pet_family_slots_used(p_pet_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_user_pet_role(p_pet_id) IN ('owner', 'admin') THEN
      1
      + (SELECT count(*)::int FROM public.pet_family_grants g WHERE g.pet_id = p_pet_id)
      + (
          SELECT count(*)::int
          FROM public.pet_family_invites i
          WHERE i.pet_id = p_pet_id
            AND i.status = 'pending'
            AND i.expires_at > timezone('utc', now())
        )
    ELSE NULL
  END;
$$;

ALTER FUNCTION public.pet_family_slots_used(uuid) OWNER TO postgres;
COMMENT ON FUNCTION public.pet_family_slots_used(uuid) IS
  'Returns 1 + active grants + pending non-expired invites for a pet, or NULL if caller is not owner/admin.';

GRANT EXECUTE ON FUNCTION public.pet_family_slots_used(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pet_family_slots_used(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Accept invite: JWT user email must match invite email; creates grant then marks accepted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_pet_family_invite_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.pet_family_invites%ROWTYPE;
  v_email text;
  v_pet_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT *
  INTO inv
  FROM public.pet_family_invites
  WHERE token = btrim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF inv.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending', 'status', inv.status::text);
  END IF;

  IF inv.expires_at <= timezone('utc', now()) THEN
    UPDATE public.pet_family_invites
    SET status = 'expired'
    WHERE id = inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  SELECT u.email::text
  INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL OR lower(btrim(v_email)) <> lower(btrim(inv.email)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  SELECT p.user_id
  INTO v_pet_owner
  FROM public.pets p
  WHERE p.id = inv.pet_id
    AND p.deleted_at IS NULL;

  IF v_pet_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pet_not_found');
  END IF;

  IF v_pet_owner = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_owner');
  END IF;

  INSERT INTO public.pet_family_grants (pet_id, grantee_id, role, invited_by)
  VALUES (inv.pet_id, auth.uid(), inv.role, NULL)
  ON CONFLICT (pet_id, grantee_id) DO UPDATE
    SET role = EXCLUDED.role;

  UPDATE public.pet_family_invites
  SET status = 'accepted'
  WHERE id = inv.id;

  RETURN jsonb_build_object(
    'ok', true,
    'pet_id', inv.pet_id,
    'role', inv.role::text
  );
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%pet_family_member_limit%'
      OR SQLERRM LIKE '%member limit (5)%'
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'member_limit');
    END IF;
    RAISE;
END;
$$;

ALTER FUNCTION public.process_pet_family_invite_token(text) OWNER TO postgres;
COMMENT ON FUNCTION public.process_pet_family_invite_token(text) IS
  'Accept a pending family invite for the signed-in user (email must match invite). '
  'New users: preserve token in the sign-up deep link and call after session is established.';

GRANT EXECUTE ON FUNCTION public.process_pet_family_invite_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pet_family_invite_token(text) TO service_role;
