-- US-FS-018 / Phase 6:
-- On transfer acceptance, clear all family access rows for the pet and snapshot
-- revoked user ids so notifications can be sent post-accept.

ALTER TABLE public.pet_transfers
  ADD COLUMN IF NOT EXISTS revoked_access_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.pet_transfers.revoked_access_user_ids IS
  'User ids that lost pet_family_grants due to transfer acceptance; used for revocation notifications.';

DROP FUNCTION IF EXISTS public.accept_pet_transfer (text, text);

CREATE OR REPLACE FUNCTION public.accept_pet_transfer (
  p_code text,
  p_pet_parent_display_name text DEFAULT NULL
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  t public.pet_transfers%ROWTYPE;
  v_pet uuid;
  v_prior_snap text;
  v_highlight_len int;
  v_revoked_access_user_ids uuid[] := '{}'::uuid[];
  i int;
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO t
  FROM public.pet_transfers
  WHERE upper(btrim(code)) = upper(btrim(p_code))
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now ());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired transfer code';
  END IF;

  IF t.from_user_id = auth.uid () THEN
    RAISE EXCEPTION 'You cannot transfer a pet to yourself';
  END IF;

  SELECT up.full_name
  INTO v_prior_snap
  FROM public.user_preferences up
  WHERE up.user_id = t.from_user_id
  LIMIT 1;

  UPDATE public.pets p
  SET
    user_id = auth.uid (),
    pet_parent_display_name = CASE WHEN p_pet_parent_display_name IS NOT NULL
      AND btrim(p_pet_parent_display_name) <> '' THEN
      btrim(p_pet_parent_display_name)
    ELSE
      p.pet_parent_display_name
    END
  WHERE
    p.id = t.pet_id
    AND p.user_id = t.from_user_id
  RETURNING
    p.id INTO v_pet;

  IF v_pet IS NULL THEN
    RAISE EXCEPTION 'Pet not found or ownership changed; transfer could not complete';
  END IF;

  SELECT coalesce(array_agg(DISTINCT g.grantee_id), '{}'::uuid[])
  INTO v_revoked_access_user_ids
  FROM public.pet_family_grants g
  WHERE g.pet_id = t.pet_id
    AND g.grantee_id <> auth.uid();

  DELETE FROM public.pet_family_grants g
  WHERE g.pet_id = t.pet_id;

  DELETE FROM public.pet_family_invites i2
  WHERE i2.pet_id = t.pet_id;

  UPDATE public.pet_transfers
  SET
    used_at = now (),
    to_user_id = auth.uid (),
    is_active = false,
    prior_owner_display_snapshot = CASE WHEN t.prior_owner_show_name THEN
      v_prior_snap
    ELSE
      NULL
    END,
    revoked_access_user_ids = v_revoked_access_user_ids
  WHERE
    id = t.id;

  DELETE FROM public.pet_care_team_members c
  WHERE c.pet_id = t.pet_id;

  DELETE FROM public.pet_journal_entries j
  WHERE j.pet_id = t.pet_id
    AND j.id = ANY (t.excluded_journal_entry_ids)
    AND NOT coalesce(j.vet_flagged, false);

  DELETE FROM public.pet_journal_transfer_highlights h
  WHERE h.pet_id = t.pet_id;

  v_highlight_len := coalesce(array_length(t.journal_highlight_entry_ids, 1), 0);

  IF v_highlight_len > 0 THEN
    FOR i IN 1..v_highlight_len LOOP
      INSERT INTO public.pet_journal_transfer_highlights (pet_id, journal_entry_id, sort_order)
        VALUES (t.pet_id, t.journal_highlight_entry_ids[i], i::smallint);
    END LOOP;
  END IF;

  RETURN v_pet;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_pet_transfer (text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_pet_transfer (text, text) TO authenticated;
