-- Fix pet creation failing with 42501 on public.pets:
-- AFTER INSERT trigger ensure_pet_owner_notification_prefs seeds pet_family_notification_prefs.
-- That INSERT runs under RLS; when the policy check fails, the whole pets INSERT rolls back.
-- Seed insert is trusted (pairs NEW.id / NEW.user_id from the row just inserted); bypass RLS for it only.

CREATE OR REPLACE FUNCTION public.ensure_pet_owner_notification_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO public.pet_family_notification_prefs (pet_id, user_id)
  VALUES (NEW.id, NEW.user_id)
  ON CONFLICT (pet_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.ensure_pet_owner_notification_prefs() OWNER TO postgres;

-- Idempotent repair if INSERT policy was missing or renamed on a database branch.
DROP POLICY IF EXISTS pets_insert_own ON public.pets;
CREATE POLICY pets_insert_own
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
