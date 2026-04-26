-- Phase 4: shared activity feed + per-pet notification prefs + lifecycle logging.
--
-- Push delivery: deploy Edge function `pet-family-activity-notify`, set secret PET_ACTIVITY_NOTIFY_SECRET,
-- then create a Database Webhook on public.pet_activity_events (INSERT) to:
--   https://<project-ref>.supabase.co/functions/v1/pet-family-activity-notify
-- with HTTP header: x-pet-activity-secret: <same secret>
-- (Supabase Dashboard → Database → Webhooks). Optional: POST the same payload from automation.

-- ---------------------------------------------------------------------------
-- Enums & tables
-- ---------------------------------------------------------------------------
CREATE TYPE public.pet_care_notification_scope AS ENUM (
  'all',
  'meds_only',
  'journal_only',
  'none'
);

CREATE TABLE public.pet_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  summary text NOT NULL,
  ref_table text,
  ref_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX pet_activity_events_pet_created_idx
  ON public.pet_activity_events (pet_id, created_at DESC);

COMMENT ON TABLE public.pet_activity_events IS
  'Append-only care & family lifecycle events for shared pet activity feed.';

CREATE TABLE public.pet_family_notification_prefs (
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  care_activity_scope public.pet_care_notification_scope NOT NULL DEFAULT 'all',
  lifecycle_push_enabled boolean NOT NULL DEFAULT true,
  care_push_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT pet_family_notification_prefs_pkey PRIMARY KEY (pet_id, user_id)
);

CREATE INDEX pet_family_notification_prefs_user_idx
  ON public.pet_family_notification_prefs (user_id);

COMMENT ON TABLE public.pet_family_notification_prefs IS
  'Per-pet push scope for shared users: care_activity_scope filters health/journal pushes; lifecycle_* covers invites/role/revoke.';

INSERT INTO public.pet_family_notification_prefs (pet_id, user_id)
SELECT p.id, p.user_id
FROM public.pets p
WHERE p.deleted_at IS NULL
ON CONFLICT (pet_id, user_id) DO NOTHING;

INSERT INTO public.pet_family_notification_prefs (pet_id, user_id)
SELECT g.pet_id, g.grantee_id
FROM public.pet_family_grants g
ON CONFLICT (pet_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Core writer (SECURITY DEFINER; used by triggers and RPC)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_pet_activity_event(
  p_pet_id uuid,
  p_actor_id uuid,
  p_kind text,
  p_summary text,
  p_ref_table text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.pet_activity_events (
    pet_id,
    actor_id,
    kind,
    summary,
    ref_table,
    ref_id,
    payload
  )
  VALUES (
    p_pet_id,
    p_actor_id,
    p_kind,
    p_summary,
    p_ref_table,
    p_ref_id,
    COALESCE(p_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.insert_pet_activity_event(uuid, uuid, text, text, text, uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.insert_pet_activity_event(uuid, uuid, text, text, text, uuid, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- Helper: display name for summaries (best-effort)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.display_name_for_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(
        NULLIF(btrim(up.full_name), ''),
        NULLIF(split_part(u.email::text, '@', 1), ''),
        'Someone'
      )
      FROM auth.users u
      LEFT JOIN public.user_preferences up ON up.user_id = u.id
      WHERE u.id = p_user_id
      LIMIT 1
    ),
    'Someone'
  );
$$;

ALTER FUNCTION public.display_name_for_user(uuid) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- Row triggers → activity log
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_log_vaccination_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid := COALESCE(NEW.pet_id, OLD.pet_id);
  aid uuid := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  pname text;
  aname text;
BEGIN
  SELECT p.name INTO pname FROM public.pets p WHERE p.id = pid LIMIT 1;
  aname := public.display_name_for_user(aid);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.insert_pet_activity_event(
      pid,
      aid,
      'vaccine_added',
      aname || ' added vaccine "' || COALESCE(NEW.name, 'record') || '" for ' || COALESCE(pname, 'pet'),
      'vaccinations',
      NEW.id,
      jsonb_build_object('name', NEW.name)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.insert_pet_activity_event(
      pid,
      aid,
      'vaccine_updated',
      aname || ' updated vaccine "' || COALESCE(NEW.name, 'record') || '" for ' || COALESCE(pname, 'pet'),
      'vaccinations',
      NEW.id,
      jsonb_build_object('name', NEW.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_vaccinations_activity_ai
  AFTER INSERT ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_vaccination_activity();

CREATE TRIGGER trg_vaccinations_activity_au
  AFTER UPDATE ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_vaccination_activity();

CREATE OR REPLACE FUNCTION public.trg_log_medicine_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid := COALESCE(NEW.pet_id, OLD.pet_id);
  aid uuid := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  pname text;
  aname text;
BEGIN
  SELECT p.name INTO pname FROM public.pets p WHERE p.id = pid LIMIT 1;
  aname := public.display_name_for_user(aid);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.insert_pet_activity_event(
      pid,
      aid,
      'med_added',
      aname || ' added medication "' || COALESCE(NEW.name, 'record') || '" for ' || COALESCE(pname, 'pet'),
      'medicines',
      NEW.id,
      jsonb_build_object('name', NEW.name)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.insert_pet_activity_event(
      pid,
      aid,
      'med_updated',
      aname || ' updated medication "' || COALESCE(NEW.name, 'record') || '" for ' || COALESCE(pname, 'pet'),
      'medicines',
      NEW.id,
      jsonb_build_object('name', NEW.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_medicines_activity_ai
  AFTER INSERT ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_medicine_activity();

CREATE TRIGGER trg_medicines_activity_au
  AFTER UPDATE ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_medicine_activity();

CREATE OR REPLACE FUNCTION public.trg_log_journal_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid := COALESCE(NEW.pet_id, OLD.pet_id);
  aid uuid := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  pname text;
  aname text;
BEGIN
  SELECT p.name INTO pname FROM public.pets p WHERE p.id = pid LIMIT 1;
  aname := public.display_name_for_user(aid);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.insert_pet_activity_event(
      pid,
      aid,
      'journal_added',
      aname || ' added a journal note for ' || COALESCE(pname, 'pet'),
      'pet_journal_entries',
      NEW.id,
      jsonb_build_object('domain', NEW.domain, 'subtype', NEW.subtype)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.insert_pet_activity_event(
      pid,
      aid,
      'journal_updated',
      aname || ' updated a journal entry for ' || COALESCE(pname, 'pet'),
      'pet_journal_entries',
      NEW.id,
      jsonb_build_object('domain', NEW.domain, 'subtype', NEW.subtype)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_pet_journal_entries_activity_ai
  AFTER INSERT ON public.pet_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_journal_activity();

CREATE TRIGGER trg_pet_journal_entries_activity_au
  AFTER UPDATE ON public.pet_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_journal_activity();

CREATE OR REPLACE FUNCTION public.trg_log_family_grant_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pname text;
  aname text;
  grantee_name text;
BEGIN
  SELECT p.name INTO pname FROM public.pets p WHERE p.id = COALESCE(NEW.pet_id, OLD.pet_id) LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    grantee_name := public.display_name_for_user(NEW.grantee_id);
    aname := COALESCE(public.display_name_for_user(auth.uid()), grantee_name);
    PERFORM public.insert_pet_activity_event(
      NEW.pet_id,
      COALESCE(auth.uid(), NEW.grantee_id),
      'grant_added',
      grantee_name || ' joined the care team for ' || COALESCE(pname, 'this pet'),
      'pet_family_grants',
      NEW.id,
      jsonb_build_object('role', NEW.role::text, 'grantee_id', NEW.grantee_id)
    );
    INSERT INTO public.pet_family_notification_prefs (pet_id, user_id)
    VALUES (NEW.pet_id, NEW.grantee_id)
    ON CONFLICT (pet_id, user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    aname := public.display_name_for_user(auth.uid());
    grantee_name := public.display_name_for_user(NEW.grantee_id);
    PERFORM public.insert_pet_activity_event(
      NEW.pet_id,
      COALESCE(auth.uid(), NEW.grantee_id),
      'role_changed',
      aname || ' changed the role for ' || grantee_name || ' on ' || COALESCE(pname, 'this pet') || ' to ' || NEW.role::text,
      'pet_family_grants',
      NEW.id,
      jsonb_build_object('from', OLD.role::text, 'to', NEW.role::text, 'grantee_id', NEW.grantee_id)
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pet_family_grants_activity_ai
  AFTER INSERT ON public.pet_family_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_family_grant_activity();

CREATE TRIGGER trg_pet_family_grants_activity_au
  AFTER UPDATE ON public.pet_family_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_family_grant_activity();

CREATE OR REPLACE FUNCTION public.trg_log_family_grant_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pname text;
  aname text;
  gname text;
BEGIN
  SELECT p.name INTO pname FROM public.pets p WHERE p.id = OLD.pet_id LIMIT 1;
  aname := public.display_name_for_user(COALESCE(auth.uid(), OLD.grantee_id));
  gname := public.display_name_for_user(OLD.grantee_id);
  PERFORM public.insert_pet_activity_event(
    OLD.pet_id,
    COALESCE(auth.uid(), OLD.grantee_id),
    'access_revoked',
    aname || ' removed ' || gname || ' from the care team for ' || COALESCE(pname, 'this pet'),
    'pet_family_grants',
    OLD.id,
    jsonb_build_object('grantee_id', OLD.grantee_id)
  );
  DELETE FROM public.pet_family_notification_prefs
  WHERE pet_id = OLD.pet_id
    AND user_id = OLD.grantee_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_pet_family_grants_activity_ad
  AFTER DELETE ON public.pet_family_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_family_grant_deleted();

-- ---------------------------------------------------------------------------
-- Invite accepted log (RPC extended)
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

-- ---------------------------------------------------------------------------
-- Default prefs for pet owner (so toggles have a row to update)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_pet_owner_notification_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pet_family_notification_prefs (pet_id, user_id)
  VALUES (NEW.id, NEW.user_id)
  ON CONFLICT (pet_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pets_owner_notification_prefs_ai
  AFTER INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_pet_owner_notification_prefs();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.pet_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_family_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_activity_events_select_family
  ON public.pet_activity_events
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY pet_family_notification_prefs_select
  ON public.pet_family_notification_prefs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.user_can_access_pet(pet_id));

CREATE POLICY pet_family_notification_prefs_upsert
  ON public.pet_family_notification_prefs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.user_can_access_pet(pet_id));

CREATE POLICY pet_family_notification_prefs_update
  ON public.pet_family_notification_prefs
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.user_can_access_pet(pet_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.user_can_access_pet(pet_id));

GRANT SELECT ON public.pet_activity_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_family_notification_prefs TO authenticated;
GRANT ALL ON public.pet_activity_events TO service_role;
GRANT ALL ON public.pet_family_notification_prefs TO service_role;

-- ---------------------------------------------------------------------------
-- Realtime (in-app live feed)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_activity_events;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

CREATE TRIGGER handle_pet_family_notification_prefs_updated_at
  BEFORE UPDATE ON public.pet_family_notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
