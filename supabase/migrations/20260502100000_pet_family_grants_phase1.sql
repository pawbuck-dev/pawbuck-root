-- Phase 1: per-pet family sharing (grants), 5-member cap, admin-only Milo chat visibility.
-- Mitigation: additive schema + backfill from household_members; RLS widens access only where
--   a matching pet_family_grants row exists (backfill creates admin grants for prior household access).
-- Rollback: forward-only; revoke grants / drop tables in a new migration if needed.
-- Verify: SELECT count(*) FROM pet_family_grants; compare to household_members * pets join shape.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.pet_role AS ENUM ('view_only', 'contributor', 'admin');

CREATE TYPE public.pet_family_invite_status AS ENUM (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.pet_family_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  grantee_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.pet_role NOT NULL,
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT pet_family_grants_pet_grantee_key UNIQUE (pet_id, grantee_id)
);

CREATE INDEX pet_family_grants_grantee_id_idx ON public.pet_family_grants (grantee_id);
CREATE INDEX pet_family_grants_pet_id_idx ON public.pet_family_grants (pet_id);

COMMENT ON TABLE public.pet_family_grants IS 'Per-pet access: grantee has role; owner is implicit and not stored here.';

CREATE TABLE public.pet_family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.pet_role NOT NULL,
  token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '14 days'),
  status public.pet_family_invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT pet_family_invites_token_key UNIQUE (token)
);

CREATE INDEX pet_family_invites_pet_id_idx ON public.pet_family_invites (pet_id);

CREATE UNIQUE INDEX pet_family_invites_one_pending_per_email
  ON public.pet_family_invites (pet_id, lower(email))
  WHERE status = 'pending';

COMMENT ON TABLE public.pet_family_invites IS 'Email invites to join a pet family; pending rows count toward the 5-member cap.';

-- ---------------------------------------------------------------------------
-- 5-member limit: 1 owner + grants + pending (non-expired) invites <= 5
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_pet_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pet_id uuid;
  v_slots int;
BEGIN
  v_pet_id := NEW.pet_id;

  v_slots :=
    1
    + (SELECT count(*)::int FROM public.pet_family_grants g WHERE g.pet_id = v_pet_id)
    + (
        SELECT count(*)::int
        FROM public.pet_family_invites i
        WHERE i.pet_id = v_pet_id
          AND i.status = 'pending'
          AND i.expires_at > timezone('utc', now())
      );

  -- BEFORE INSERT: new row not yet counted; require room for one more member slot.
  IF v_slots + 1 > 5 THEN
    RAISE EXCEPTION 'pet_family_member_limit'
      USING MESSAGE = 'Pet family member limit (5) reached for this pet.';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.check_pet_member_limit() OWNER TO postgres;

CREATE TRIGGER pet_family_grants_check_member_limit
  BEFORE INSERT ON public.pet_family_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pet_member_limit();

CREATE TRIGGER pet_family_invites_check_member_limit
  BEFORE INSERT ON public.pet_family_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pet_member_limit();

-- ---------------------------------------------------------------------------
-- Option C: household_members -> pet_family_grants (admin) for all pets of owner
-- (Before replacing user_can_access_pet so a single transaction stays consistent.)
-- ---------------------------------------------------------------------------
INSERT INTO public.pet_family_grants (pet_id, grantee_id, role, invited_by)
SELECT
  p.id,
  hm.user_id,
  'admin'::public.pet_role,
  hm.household_owner_id
FROM public.household_members hm
INNER JOIN public.pets p
  ON p.user_id = hm.household_owner_id
  AND p.deleted_at IS NULL
WHERE hm.is_active = true
  AND hm.user_id IS DISTINCT FROM hm.household_owner_id
ON CONFLICT (pet_id, grantee_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER: same pattern as user_can_access_pet)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_pet_role(p_pet_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_pet_id
      AND p.deleted_at IS NULL
      AND p.user_id = uid
  ) THEN
    RETURN 'owner';
  END IF;

  RETURN (
    SELECT g.role::text
    FROM public.pet_family_grants g
    WHERE g.pet_id = p_pet_id
      AND g.grantee_id = uid
    LIMIT 1
  );
END;
$$;

ALTER FUNCTION public.get_user_pet_role(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_pet_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_pet_role(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.user_can_write_pet_health(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_pet_role(p_pet_id), '')
    IN ('owner', 'admin', 'contributor');
$$;

ALTER FUNCTION public.user_can_write_pet_health(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.user_can_write_pet_health(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_write_pet_health(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.user_can_access_pet(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_pet_role(p_pet_id) IS NOT NULL;
$$;

-- ---------------------------------------------------------------------------
-- RLS: new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.pet_family_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_family_grants_select
  ON public.pet_family_grants
  FOR SELECT
  TO authenticated
  USING (
    grantee_id = (SELECT auth.uid())
    OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
  );

CREATE POLICY pet_family_grants_insert
  ON public.pet_family_grants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

CREATE POLICY pet_family_grants_update
  ON public.pet_family_grants
  FOR UPDATE
  TO authenticated
  USING (public.get_user_pet_role(pet_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

CREATE POLICY pet_family_grants_delete
  ON public.pet_family_grants
  FOR DELETE
  TO authenticated
  USING (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

CREATE POLICY pet_family_invites_select
  ON public.pet_family_invites
  FOR SELECT
  TO authenticated
  USING (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

CREATE POLICY pet_family_invites_insert
  ON public.pet_family_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

CREATE POLICY pet_family_invites_update
  ON public.pet_family_invites
  FOR UPDATE
  TO authenticated
  USING (public.get_user_pet_role(pet_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

CREATE POLICY pet_family_invites_delete
  ON public.pet_family_invites
  FOR DELETE
  TO authenticated
  USING (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_family_grants TO authenticated;
GRANT ALL ON public.pet_family_grants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_family_invites TO authenticated;
GRANT ALL ON public.pet_family_invites TO service_role;

-- ---------------------------------------------------------------------------
-- pets: SELECT any grant; UPDATE owner or admin only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS pets_update_own ON public.pets;

CREATE POLICY pets_update_owner_or_admin
  ON public.pets
  FOR UPDATE
  TO authenticated
  USING (public.get_user_pet_role(id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_pet_role(id) IN ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- Milo journal chat turns (product: Milo chat per pet) — no milo_chats table in schema
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS milo_journal_chat_turns_select_owner_admin ON public.milo_journal_chat_turns;
CREATE POLICY milo_journal_chat_turns_select_owner_admin
  ON public.milo_journal_chat_turns
  FOR SELECT
  TO authenticated
  USING (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

DROP POLICY IF EXISTS milo_journal_chat_turns_update_creator ON public.milo_journal_chat_turns;
CREATE POLICY milo_journal_chat_turns_update_creator
  ON public.milo_journal_chat_turns
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS milo_journal_chat_turns_delete_creator ON public.milo_journal_chat_turns;
CREATE POLICY milo_journal_chat_turns_delete_creator
  ON public.milo_journal_chat_turns
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Feedback: allow pet owner/admin to read feedback linked to a turn on their pet
DROP POLICY IF EXISTS milo_journal_feedback_select_visible ON public.milo_journal_message_feedback;
CREATE POLICY milo_journal_feedback_select_visible
  ON public.milo_journal_message_feedback
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.milo_journal_chat_turns t
      WHERE t.id = milo_journal_message_feedback.turn_id
        AND public.get_user_pet_role(t.pet_id) IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- Health: SELECT any access; INSERT/UPDATE (and DELETE) for owner / admin / contributor
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS clinical_exams_insert_accessible ON public.clinical_exams;
CREATE POLICY clinical_exams_insert_accessible
  ON public.clinical_exams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_write_pet_health(pet_id));

DROP POLICY IF EXISTS clinical_exams_update_own ON public.clinical_exams;
CREATE POLICY clinical_exams_update_health
  ON public.clinical_exams FOR UPDATE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS clinical_exams_delete_own ON public.clinical_exams;
CREATE POLICY clinical_exams_delete_health
  ON public.clinical_exams FOR DELETE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS lab_results_insert_accessible ON public.lab_results;
CREATE POLICY lab_results_insert_accessible
  ON public.lab_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_write_pet_health(pet_id));

DROP POLICY IF EXISTS lab_results_update_own ON public.lab_results;
CREATE POLICY lab_results_update_health
  ON public.lab_results FOR UPDATE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS lab_results_delete_own ON public.lab_results;
CREATE POLICY lab_results_delete_health
  ON public.lab_results FOR DELETE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS medicines_insert_accessible ON public.medicines;
CREATE POLICY medicines_insert_accessible
  ON public.medicines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_write_pet_health(pet_id));

DROP POLICY IF EXISTS medicines_update_own ON public.medicines;
CREATE POLICY medicines_update_health
  ON public.medicines FOR UPDATE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS medicines_delete_own ON public.medicines;
CREATE POLICY medicines_delete_health
  ON public.medicines FOR DELETE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS vaccinations_insert_accessible ON public.vaccinations;
CREATE POLICY vaccinations_insert_accessible
  ON public.vaccinations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_write_pet_health(pet_id));

DROP POLICY IF EXISTS vaccinations_update_own ON public.vaccinations;
CREATE POLICY vaccinations_update_health
  ON public.vaccinations FOR UPDATE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS vaccinations_delete_own ON public.vaccinations;
CREATE POLICY vaccinations_delete_health
  ON public.vaccinations FOR DELETE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS medication_doses_insert_accessible ON public.medication_doses;
CREATE POLICY medication_doses_insert_accessible
  ON public.medication_doses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_write_pet_health(pet_id));

DROP POLICY IF EXISTS medication_doses_update_own ON public.medication_doses;
CREATE POLICY medication_doses_update_health
  ON public.medication_doses FOR UPDATE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS medication_doses_delete_own ON public.medication_doses;
CREATE POLICY medication_doses_delete_health
  ON public.medication_doses FOR DELETE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS pet_journal_entries_insert_accessible ON public.pet_journal_entries;
CREATE POLICY pet_journal_entries_insert_accessible
  ON public.pet_journal_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_write_pet_health(pet_id));

DROP POLICY IF EXISTS pet_journal_entries_update_own ON public.pet_journal_entries;
CREATE POLICY pet_journal_entries_update_health
  ON public.pet_journal_entries FOR UPDATE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS pet_journal_entries_delete_own ON public.pet_journal_entries;
CREATE POLICY pet_journal_entries_delete_health
  ON public.pet_journal_entries FOR DELETE TO authenticated
  USING (
    public.user_can_write_pet_health(pet_id)
    AND (
      auth.uid() = user_id
      OR public.get_user_pet_role(pet_id) IN ('owner', 'admin')
    )
  );
