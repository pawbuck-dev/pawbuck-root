-- Launch hardening: SECURITY DEFINER bodies still evaluate RLS as the session role on Supabase
-- when table ownership / FORCE RLS does not bypass. UAT: nested writes surfaced as 42501 on the
-- outer table. This migration disables RLS only inside vetted RPCs after argument/auth checks.
--
-- Audited (no change; SELECT-only or gate helpers): auth_user_passes_premium_gate,
--   pet_family_slots_used, get_user_pet_role, user_can_write_pet_health, user_can_access_pet,
--   display_name_for_user, lookup_auth_user_id_by_email, lookup_auth_email_by_id,
--   match_documentation, pawthon_my_weekly_walker_rank, validate_pet_transfer_journal_refs,
--   check_pet_member_limit, trg_log_vaccination_activity, trg_log_medicine_activity,
--   trg_log_journal_activity (DML only via insert_pet_activity_event — fixed in 20260511121000).

-- ---------------------------------------------------------------------------
-- preview_pet_transfer: recipient / anon must read transfer + pet + health rows by code only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preview_pet_transfer (p_code text)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  t public.pet_transfers%ROWTYPE;
  v_today date := (timezone('utc'::text, now()))::date;
BEGIN
  SET LOCAL row_security = off;

  SELECT
    *
  INTO t
  FROM
    public.pet_transfers
  WHERE
    upper(btrim(code)) = upper(btrim(p_code))
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.pets p
    WHERE
      p.id = t.pet_id
      AND p.deleted_at IS NULL) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'pet',
    (
      SELECT
        jsonb_build_object(
          'name', p.name,
          'breed', p.breed,
          'photo_url', p.photo_url,
          'animal_type', p.animal_type,
          'date_of_birth', p.date_of_birth,
          'email_id', p.email_id
        )
      FROM
        public.pets p
      WHERE
        p.id = t.pet_id
        AND p.deleted_at IS NULL
    ),
    'highlights',
    (
      SELECT
        coalesce(jsonb_agg(h.obj ORDER BY h.ord), '[]'::jsonb)
      FROM (
        SELECT
          u.ord,
          jsonb_build_object(
            'id', j.id,
            'entry_date', j.entry_date,
            'domain', j.domain,
            'subtype', j.subtype,
            'note_preview', left(coalesce(j.note, ''::text), 240)
          ) AS obj
        FROM
          unnest(coalesce(t.journal_highlight_entry_ids, '{}'::uuid[])) WITH ORDINALITY AS u (jid, ord)
          INNER JOIN public.pet_journal_entries j ON j.id = u.jid
            AND j.pet_id = t.pet_id
      ) h
    ),
    'summary',
    jsonb_build_object(
      'vaccination_count', (
        SELECT
          count(*)::int
        FROM
          public.vaccinations v
        WHERE
          v.pet_id = t.pet_id
      ),
      'active_medication_count', (
        SELECT
          count(*)::int
        FROM
          public.medicines m
        WHERE
          m.pet_id = t.pet_id
          AND (m.end_date IS NULL OR m.end_date::date >= v_today)
      ),
      'clinical_exam_count', (
        SELECT
          count(*)::int
        FROM
          public.clinical_exams e
        WHERE
          e.pet_id = t.pet_id
      ),
      'document_count', (
        SELECT
          count(*)::int
        FROM
          public.pet_documents d
        WHERE
          d.pet_id = t.pet_id
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.preview_pet_transfer (text) IS
  'Returns pet preview, journal highlight snippets, and health record counts for a valid transfer code.';

-- ---------------------------------------------------------------------------
-- decline_pet_transfer: recipient UPDATE pet_transfers (RLS otherwise sender-only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decline_pet_transfer(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  SET LOCAL row_security = off;

  UPDATE public.pet_transfers t
  SET
    is_active = false,
    declined_at = now(),
    declined_by_user_id = auth.uid()
  WHERE upper(btrim(t.code)) = upper(btrim(p_code))
    AND t.is_active = true
    AND t.used_at IS NULL
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND t.from_user_id IS DISTINCT FROM auth.uid()
  RETURNING t.id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or ineligible transfer code';
  END IF;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- accept_pet_transfer: ownership move + cross-table cleanup + highlight inserts
-- ---------------------------------------------------------------------------
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.auth_user_passes_premium_gate('pet_transfer') THEN
    RAISE EXCEPTION 'PawBuck Premium is required to accept a pet transfer'
      USING ERRCODE = '42501';
  END IF;

  SET LOCAL row_security = off;

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

  IF t.from_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot transfer a pet to yourself';
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
    user_id = auth.uid(),
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
    AND g.grantee_id <> auth.uid();

  DELETE FROM public.pet_family_grants g
  WHERE g.pet_id = t.pet_id;

  DELETE FROM public.pet_family_invites i2
  WHERE i2.pet_id = t.pet_id;

  UPDATE
    public.pet_transfers
  SET
    used_at = now(),
    to_user_id = auth.uid(),
    is_active = FALSE,
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

REVOKE ALL ON FUNCTION public.accept_pet_transfer (text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_pet_transfer (text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.decline_pet_transfer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_pet_transfer(text) TO authenticated;

REVOKE ALL ON FUNCTION public.preview_pet_transfer (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_pet_transfer (text) TO anon;
GRANT EXECUTE ON FUNCTION public.preview_pet_transfer (text) TO authenticated;

-- ---------------------------------------------------------------------------
-- process_pet_family_invite_token: grantee reads invite row + inserts grant (not owner/admin)
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
  pname text;
  accepter text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SET LOCAL row_security = off;

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

  SELECT p.name INTO pname FROM public.pets p WHERE p.id = inv.pet_id LIMIT 1;
  accepter := public.display_name_for_user(auth.uid());
  PERFORM public.insert_pet_activity_event(
    inv.pet_id,
    auth.uid(),
    'invite_accepted',
    accepter || ' accepted an invite to help with ' || COALESCE(pname, 'pet'),
    'pet_family_invites',
    inv.id,
    jsonb_build_object('role', inv.role::text)
  );

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

REVOKE ALL ON FUNCTION public.process_pet_family_invite_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_pet_family_invite_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pet_family_invite_token(text) TO service_role;
