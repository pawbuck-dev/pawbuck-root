-- Same class of failure as ensure_pet_owner_notification_prefs (20260511120000):
-- SECURITY DEFINER triggers/RPC helpers that INSERT/DELETE into RLS-protected tables can fail
-- policy checks when the session role is still "authenticated", rolling back the outer mutation.

-- ---------------------------------------------------------------------------
-- Activity feed writer (used by vaccination/medicine/journal/family triggers)
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
  SET LOCAL row_security = off;
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

-- ---------------------------------------------------------------------------
-- Family grant: seed notification prefs for grantee (inline INSERT)
-- ---------------------------------------------------------------------------
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
    SET LOCAL row_security = off;
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

ALTER FUNCTION public.trg_log_family_grant_activity() OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- Family grant delete: remove prefs row (no DELETE policy on prefs for clients)
-- ---------------------------------------------------------------------------
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
  SET LOCAL row_security = off;
  DELETE FROM public.pet_family_notification_prefs
  WHERE pet_id = OLD.pet_id
    AND user_id = OLD.grantee_id;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.trg_log_family_grant_deleted() OWNER TO postgres;
