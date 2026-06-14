-- Platform gaps: document quota on health tables, pet limit excludes soft-deleted pets.

-- ---------------------------------------------------------------------------
-- Pet limit: do not count soft-deleted pets
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_pet_plan_limit ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_plan text;
  v_max int;
  v_count int;
BEGIN
  SELECT COALESCE(plan, 'free') INTO v_plan FROM public.user_entitlements WHERE user_id = NEW.user_id;
  v_plan := COALESCE(v_plan, 'free');
  SELECT max_pets INTO v_max FROM public.subscription_limits WHERE plan = v_plan;
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*)::int INTO v_count
  FROM public.pets
  WHERE user_id = NEW.user_id
    AND deleted_at IS NULL;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Pet profile limit reached (%). Upgrade to Family for unlimited pets.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Document quota: health rows with document_url (matches get_user_document_count)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_document_quota_for_health_row ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.document_url IS NULL OR btrim(NEW.document_url) = '' THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;
  IF v_user_id IS NULL THEN
    SELECT p.user_id INTO v_user_id FROM public.pets p WHERE p.id = NEW.pet_id;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot enforce document quota without pet owner'
      USING ERRCODE = '23502';
  END IF;

  PERFORM public.assert_document_quota(v_user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_document_quota_on_health_update ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.document_url IS NOT DISTINCT FROM OLD.document_url THEN
    RETURN NEW;
  END IF;

  IF NEW.document_url IS NULL OR btrim(NEW.document_url) = '' THEN
    RETURN NEW;
  END IF;

  IF OLD.document_url IS NOT NULL AND btrim(OLD.document_url) <> '' THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;
  IF v_user_id IS NULL THEN
    SELECT p.user_id INTO v_user_id FROM public.pets p WHERE p.id = NEW.pet_id;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot enforce document quota without pet owner'
      USING ERRCODE = '23502';
  END IF;

  PERFORM public.assert_document_quota(v_user_id);
  RETURN NEW;
END;
$$;

-- vaccinations
DROP TRIGGER IF EXISTS enforce_document_quota_vaccinations_insert ON public.vaccinations;
CREATE TRIGGER enforce_document_quota_vaccinations_insert
  BEFORE INSERT ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_for_health_row ();

DROP TRIGGER IF EXISTS enforce_document_quota_vaccinations_update ON public.vaccinations;
CREATE TRIGGER enforce_document_quota_vaccinations_update
  BEFORE UPDATE OF document_url ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_on_health_update ();

-- clinical_exams
DROP TRIGGER IF EXISTS enforce_document_quota_clinical_exams_insert ON public.clinical_exams;
CREATE TRIGGER enforce_document_quota_clinical_exams_insert
  BEFORE INSERT ON public.clinical_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_for_health_row ();

DROP TRIGGER IF EXISTS enforce_document_quota_clinical_exams_update ON public.clinical_exams;
CREATE TRIGGER enforce_document_quota_clinical_exams_update
  BEFORE UPDATE OF document_url ON public.clinical_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_on_health_update ();

-- lab_results
DROP TRIGGER IF EXISTS enforce_document_quota_lab_results_insert ON public.lab_results;
CREATE TRIGGER enforce_document_quota_lab_results_insert
  BEFORE INSERT ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_for_health_row ();

DROP TRIGGER IF EXISTS enforce_document_quota_lab_results_update ON public.lab_results;
CREATE TRIGGER enforce_document_quota_lab_results_update
  BEFORE UPDATE OF document_url ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_on_health_update ();

-- medicines
DROP TRIGGER IF EXISTS enforce_document_quota_medicines_insert ON public.medicines;
CREATE TRIGGER enforce_document_quota_medicines_insert
  BEFORE INSERT ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_for_health_row ();

DROP TRIGGER IF EXISTS enforce_document_quota_medicines_update ON public.medicines;
CREATE TRIGGER enforce_document_quota_medicines_update
  BEFORE UPDATE OF document_url ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_quota_on_health_update ();

COMMENT ON FUNCTION public.enforce_document_quota_for_health_row IS
  'Before INSERT on health tables when document_url is set; uses assert_document_quota.';

-- ---------------------------------------------------------------------------
-- accept_pet_transfer: enforce recipient pet limit (UPDATE bypasses INSERT trigger)
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
  v_plan text;
  v_max int;
  v_count int;
  i int;
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
