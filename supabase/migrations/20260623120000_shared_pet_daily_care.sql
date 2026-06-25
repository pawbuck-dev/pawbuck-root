-- Shared pet daily care: one daily_intake row per pet per day (household-visible).
-- Mitigation: merge duplicate per-user rows (owner row wins) before constraint change.
-- Verify: SELECT pet_id, date, count(*) FROM daily_intake GROUP BY 1,2 HAVING count(*) > 1;

-- ---------------------------------------------------------------------------
-- 1) Merge duplicate daily_intake rows → canonical per (pet_id, date)
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    di.id,
    di.pet_id,
    di.date,
    ROW_NUMBER() OVER (
      PARTITION BY di.pet_id, di.date
      ORDER BY
        CASE WHEN di.user_id = p.user_id THEN 0 ELSE 1 END,
        (di.food_intake + di.water_intake + di.poop_count + di.pee_count) DESC,
        di.updated_at DESC NULLS LAST
    ) AS rn
  FROM public.daily_intake di
  INNER JOIN public.pets p ON p.id = di.pet_id
)
DELETE FROM public.daily_intake di
USING ranked r
WHERE di.id = r.id
  AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- 2) Unique key: pet + date (user_id = last updater, not part of uniqueness)
-- ---------------------------------------------------------------------------
ALTER TABLE public.daily_intake
  DROP CONSTRAINT IF EXISTS daily_intake_pet_user_date_key;

ALTER TABLE public.daily_intake
  ADD CONSTRAINT daily_intake_pet_date_key UNIQUE (pet_id, date);

COMMENT ON COLUMN public.daily_intake.user_id IS
  'User who last updated this shared pet daily care row (household-visible).';

COMMENT ON TABLE public.daily_intake IS
  'One row per pet per calendar day; meals, water, and output shared by household.';

-- ---------------------------------------------------------------------------
-- 3) RLS: household read; contributor+ write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own daily intake" ON public.daily_intake;
DROP POLICY IF EXISTS "Users can insert their own daily intake" ON public.daily_intake;
DROP POLICY IF EXISTS "Users can update their own daily intake" ON public.daily_intake;

CREATE POLICY daily_intake_select_accessible
  ON public.daily_intake
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY daily_intake_insert_writers
  ON public.daily_intake
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY daily_intake_update_writers
  ON public.daily_intake
  FOR UPDATE
  TO authenticated
  USING (public.user_can_write_pet_health(pet_id))
  WITH CHECK (
    public.user_can_write_pet_health(pet_id)
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY daily_intake_delete_owner_admin
  ON public.daily_intake
  FOR DELETE
  TO authenticated
  USING (public.get_user_pet_role(pet_id) IN ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- 4) pet_weight_logs: family can view; contributor+ can log
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their pets weight logs" ON public.pet_weight_logs;
DROP POLICY IF EXISTS "Users can insert weight logs for their pets" ON public.pet_weight_logs;
DROP POLICY IF EXISTS "Users can update their pets weight logs" ON public.pet_weight_logs;
DROP POLICY IF EXISTS "Users can delete their pets weight logs" ON public.pet_weight_logs;

CREATE POLICY pet_weight_logs_select_accessible
  ON public.pet_weight_logs
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_pet(pet_id));

CREATE POLICY pet_weight_logs_insert_writers
  ON public.pet_weight_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_write_pet_health(pet_id)
  );

CREATE POLICY pet_weight_logs_update_own
  ON public.pet_weight_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY pet_weight_logs_delete_own
  ON public.pet_weight_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

-- ---------------------------------------------------------------------------
-- 5) Activity feed: log meaningful daily care updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_log_daily_intake_activity()
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
  summary text;
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.food_intake = NEW.food_intake
    AND OLD.water_intake = NEW.water_intake
    AND OLD.poop_count = NEW.poop_count
    AND OLD.pee_count = NEW.pee_count THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
    AND (NEW.food_intake + NEW.water_intake + NEW.poop_count + NEW.pee_count) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT p.name INTO pname FROM public.pets p WHERE p.id = pid LIMIT 1;
  aname := public.display_name_for_user(aid);
  summary := aname || ' updated today''s care for ' || COALESCE(pname, 'pet')
    || ' (meals ' || NEW.food_intake::text || '/' || NEW.food_target::text
    || ', water ' || NEW.water_intake::text || '/' || NEW.water_target::text || ')';

  PERFORM public.insert_pet_activity_event(
    pid,
    aid,
    'daily_care_updated',
    summary,
    'daily_intake',
    NEW.id,
    jsonb_build_object(
      'food_intake', NEW.food_intake,
      'water_intake', NEW.water_intake,
      'poop_count', NEW.poop_count,
      'pee_count', NEW.pee_count
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_intake_activity_ai ON public.daily_intake;
DROP TRIGGER IF EXISTS trg_daily_intake_activity_au ON public.daily_intake;

CREATE TRIGGER trg_daily_intake_activity_ai
  AFTER INSERT ON public.daily_intake
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_daily_intake_activity();

CREATE TRIGGER trg_daily_intake_activity_au
  AFTER UPDATE ON public.daily_intake
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_daily_intake_activity();

-- ---------------------------------------------------------------------------
-- 6) Realtime: live Today ring sync across household devices
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'daily_intake'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_intake;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.display_name_for_user(uuid) TO authenticated;
