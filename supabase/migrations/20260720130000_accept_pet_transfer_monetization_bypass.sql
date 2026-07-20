-- Free-launch: skip recipient pet-count cap on transfer accept when monetization is off.
-- Premium gate already uses auth_user_meets_plan_gate (bypassed when monetization_enabled=false).

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
  v_plan text;
  v_max int;
  v_count int;
  i int;
  v_link record;
  v_new_vet_id uuid;
  v_vet public.vet_information%ROWTYPE;
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.auth_user_passes_premium_gate ('pet_transfer') THEN
    RAISE EXCEPTION 'PawBuck Premium is required to accept a pet transfer'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    *
  INTO t
  FROM
    public.pet_transfers
  WHERE
    upper(btrim(code)) = upper(btrim(p_code))
    AND is_active = TRUE
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired transfer code';
  END IF;

  IF t.from_user_id = auth.uid () THEN
    RAISE EXCEPTION 'You cannot transfer a pet to yourself';
  END IF;

  -- Pet limits only apply when monetization is enabled (free launch unlocks Family capacity).
  IF public.is_monetization_enabled () THEN
    SELECT COALESCE(plan, 'free') INTO v_plan FROM public.user_entitlements WHERE user_id = auth.uid();
    v_plan := COALESCE(v_plan, 'free');
    SELECT max_pets INTO v_max FROM public.subscription_limits WHERE plan = v_plan;
    IF v_max IS NOT NULL THEN
      SELECT COUNT(*)::int INTO v_count
      FROM public.pets
      WHERE user_id = auth.uid()
        AND deleted_at IS NULL;
      IF v_count >= v_max THEN
        RAISE EXCEPTION 'Pet profile limit reached (%). Upgrade to Family to accept this pet.', v_max
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  SELECT
    up.full_name
  INTO v_prior_snap
  FROM
    public.user_preferences up
  WHERE
    up.user_id = t.from_user_id
  LIMIT 1;

  UPDATE
    public.pets p
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

  SELECT
    coalesce(array_agg(DISTINCT g.grantee_id), '{}'::uuid[])
  INTO v_revoked_access_user_ids
  FROM
    public.pet_family_grants g
  WHERE
    g.pet_id = t.pet_id
    AND g.grantee_id <> auth.uid ();

  DELETE FROM public.pet_family_grants g
  WHERE g.pet_id = t.pet_id;

  DELETE FROM public.pet_family_invites i2
  WHERE i2.pet_id = t.pet_id;

  UPDATE
    public.pet_transfers
  SET
    used_at = now (),
    to_user_id = auth.uid (),
    is_active = FALSE,
    prior_owner_display_snapshot = CASE WHEN t.prior_owner_show_name THEN
      v_prior_snap
    ELSE
      NULL
    END,
    revoked_access_user_ids = v_revoked_access_user_ids
  WHERE
    id = t.id;

  FOR v_link IN
    SELECT
      pctm.id AS link_id,
      pctm.care_team_member_id AS vet_id
    FROM
      public.pet_care_team_members pctm
    WHERE
      pctm.pet_id = t.pet_id
  LOOP
    IF EXISTS (
      SELECT
        1
      FROM
        public.pet_care_team_members pctm2
        INNER JOIN public.pets p ON p.id = pctm2.pet_id
      WHERE
        pctm2.care_team_member_id = v_link.vet_id
        AND pctm2.pet_id <> t.pet_id
        AND p.user_id = t.from_user_id
        AND p.deleted_at IS NULL) THEN
      SELECT
        *
      INTO v_vet
      FROM
        public.vet_information
      WHERE
        id = v_link.vet_id;

      IF FOUND THEN
        INSERT INTO public.vet_information (
          clinic_name,
          vet_name,
          email,
          phone,
          address,
          type,
          created_at,
          updated_at)
        VALUES (
          v_vet.clinic_name,
          v_vet.vet_name,
          v_vet.email,
          v_vet.phone,
          v_vet.address,
          v_vet.type,
          now(),
          now())
      RETURNING
        id INTO v_new_vet_id;

        UPDATE
          public.pet_care_team_members
        SET
          care_team_member_id = v_new_vet_id
        WHERE
          id = v_link.link_id;
      END IF;
    END IF;
  END LOOP;

  DELETE FROM public.pet_journal_entries j
  WHERE j.pet_id = t.pet_id
    AND j.id = ANY (t.excluded_journal_entry_ids)
    AND NOT coalesce(j.vet_flagged, FALSE);

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

COMMENT ON FUNCTION public.accept_pet_transfer (text, text) IS
  'Accept pet ownership transfer. Pet-count cap skipped when is_monetization_enabled() is false.';
