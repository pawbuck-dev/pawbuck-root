-- Pet journal + allergies + conditions; household members can access pets (same household as owner).
-- Also: widen SELECT on core health tables for shared visibility; walk_sessions use pet access helper.

-- ---------------------------------------------------------------------------
-- Helper: owner OR member of owner's household (via household_members)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_access_pet(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_pet_id
      AND p.deleted_at IS NULL
      AND (
        p.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.household_members hm
          WHERE hm.user_id = (SELECT auth.uid())
            AND hm.household_owner_id = p.user_id
        )
      )
  );
$$;

ALTER FUNCTION public.user_can_access_pet(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.user_can_access_pet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_pet(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- pets: SELECT for household; mutations owner-only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Policy with security definer functions" ON public.pets;

CREATE POLICY "pets_select_accessible"
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_pet(id));

CREATE POLICY "pets_insert_own"
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pets_update_own"
  ON public.pets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pets_delete_own"
  ON public.pets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- clinical_exams, lab_results, medicines, vaccinations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Policy with security definer functions" ON public.clinical_exams;

CREATE POLICY "clinical_exams_select_accessible"
  ON public.clinical_exams FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "clinical_exams_insert_accessible"
  ON public.clinical_exams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "clinical_exams_update_own"
  ON public.clinical_exams FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "clinical_exams_delete_own"
  ON public.clinical_exams FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

DROP POLICY IF EXISTS "Policy with security definer functions" ON public.lab_results;

CREATE POLICY "lab_results_select_accessible"
  ON public.lab_results FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "lab_results_insert_accessible"
  ON public.lab_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "lab_results_update_own"
  ON public.lab_results FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "lab_results_delete_own"
  ON public.lab_results FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

DROP POLICY IF EXISTS "Policy with security definer functions" ON public.medicines;

CREATE POLICY "medicines_select_accessible"
  ON public.medicines FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "medicines_insert_accessible"
  ON public.medicines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "medicines_update_own"
  ON public.medicines FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "medicines_delete_own"
  ON public.medicines FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

DROP POLICY IF EXISTS "Policy with security definer functions" ON public.vaccinations;

CREATE POLICY "vaccinations_select_accessible"
  ON public.vaccinations FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "vaccinations_insert_accessible"
  ON public.vaccinations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "vaccinations_update_own"
  ON public.vaccinations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "vaccinations_delete_own"
  ON public.vaccinations FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

-- ---------------------------------------------------------------------------
-- medication_doses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own medication doses" ON public.medication_doses;
DROP POLICY IF EXISTS "Users can insert their own medication doses" ON public.medication_doses;
DROP POLICY IF EXISTS "Users can update their own medication doses" ON public.medication_doses;
DROP POLICY IF EXISTS "Users can delete their own medication doses" ON public.medication_doses;

CREATE POLICY "medication_doses_select_accessible"
  ON public.medication_doses FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "medication_doses_insert_accessible"
  ON public.medication_doses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "medication_doses_update_own"
  ON public.medication_doses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "medication_doses_delete_own"
  ON public.medication_doses FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

-- ---------------------------------------------------------------------------
-- walk_sessions: anyone with pet access can see walks; walker owns mutations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "walk_sessions_select_own" ON public.walk_sessions;
DROP POLICY IF EXISTS "walk_sessions_insert_own" ON public.walk_sessions;
DROP POLICY IF EXISTS "walk_sessions_update_own" ON public.walk_sessions;
DROP POLICY IF EXISTS "walk_sessions_delete_own" ON public.walk_sessions;

CREATE POLICY "walk_sessions_select_accessible"
  ON public.walk_sessions FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "walk_sessions_insert_walker"
  ON public.walk_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "walk_sessions_update_own"
  ON public.walk_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "walk_sessions_delete_own"
  ON public.walk_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

-- ---------------------------------------------------------------------------
-- pet_journal_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pet_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  domain text NOT NULL
    CHECK (domain = ANY (ARRAY['health'::text, 'behavioral'::text, 'environmental'::text])),
  subtype text NOT NULL,
  note text,
  vet_flagged boolean NOT NULL DEFAULT false,
  entry_date date NOT NULL DEFAULT ((timezone('utc'::text, now())))::date,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS pet_journal_entries_pet_entry_date_idx
  ON public.pet_journal_entries (pet_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS pet_journal_entries_pet_domain_idx
  ON public.pet_journal_entries (pet_id, domain);

COMMENT ON TABLE public.pet_journal_entries IS 'Owner/household journal: health, behavioral, environmental notes for briefing / vet context.';

CREATE TRIGGER handle_pet_journal_entries_updated_at
  BEFORE UPDATE ON public.pet_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.pet_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_journal_entries_select_accessible"
  ON public.pet_journal_entries FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "pet_journal_entries_insert_accessible"
  ON public.pet_journal_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "pet_journal_entries_update_own"
  ON public.pet_journal_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "pet_journal_entries_delete_own"
  ON public.pet_journal_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

GRANT ALL ON TABLE public.pet_journal_entries TO anon;
GRANT ALL ON TABLE public.pet_journal_entries TO authenticated;
GRANT ALL ON TABLE public.pet_journal_entries TO service_role;

-- ---------------------------------------------------------------------------
-- pet_allergies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pet_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS pet_allergies_pet_id_idx ON public.pet_allergies (pet_id);

CREATE TRIGGER handle_pet_allergies_updated_at
  BEFORE UPDATE ON public.pet_allergies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.pet_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_allergies_select_accessible"
  ON public.pet_allergies FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "pet_allergies_insert_accessible"
  ON public.pet_allergies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "pet_allergies_update_own"
  ON public.pet_allergies FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "pet_allergies_delete_own"
  ON public.pet_allergies FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

GRANT ALL ON TABLE public.pet_allergies TO anon;
GRANT ALL ON TABLE public.pet_allergies TO authenticated;
GRANT ALL ON TABLE public.pet_allergies TO service_role;

-- ---------------------------------------------------------------------------
-- pet_conditions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pet_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  diagnosed_on date,
  status text NOT NULL DEFAULT 'active'::text
    CHECK (status = ANY (ARRAY['active'::text, 'resolved'::text, 'suspected'::text])),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS pet_conditions_pet_id_idx ON public.pet_conditions (pet_id);

CREATE TRIGGER handle_pet_conditions_updated_at
  BEFORE UPDATE ON public.pet_conditions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.pet_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_conditions_select_accessible"
  ON public.pet_conditions FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY "pet_conditions_insert_accessible"
  ON public.pet_conditions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "pet_conditions_update_own"
  ON public.pet_conditions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "pet_conditions_delete_own"
  ON public.pet_conditions FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

GRANT ALL ON TABLE public.pet_conditions TO anon;
GRANT ALL ON TABLE public.pet_conditions TO authenticated;
GRANT ALL ON TABLE public.pet_conditions TO service_role;
