-- Consumer onboarding: direct INSERT into public.pets can return 42501 (RLS) in some client/JWT edge cases.
-- This RPC runs as SECURITY DEFINER (postgres table owner) so the row insert succeeds while still
-- forcing user_id = auth.uid() (invoker's JWT sub). No client-supplied owner.

CREATE OR REPLACE FUNCTION public.insert_pet_for_current_user(p_fields jsonb)
RETURNS public.pets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.pets;
  v_name text := trim(p_fields->>'name');
  v_animal text := trim(p_fields->>'animal_type');
  v_breed text := trim(p_fields->>'breed');
  v_sex text := trim(p_fields->>'sex');
  v_country text := trim(p_fields->>'country');
  v_weight_unit text := trim(p_fields->>'weight_unit');
  v_email_id text := lower(trim(p_fields->>'email_id'));
  v_dob date;
  v_weight numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF v_name = '' OR v_animal = '' OR v_breed = '' OR v_sex = '' OR v_country = '' OR v_weight_unit = '' OR v_email_id = '' THEN
    RAISE EXCEPTION 'missing required pet fields'
      USING ERRCODE = '23502';
  END IF;

  BEGIN
    v_dob := (trim(p_fields->>'date_of_birth'))::timestamptz::date;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'invalid date_of_birth'
      USING ERRCODE = '22007';
  END;

  BEGIN
    v_weight := (trim(p_fields->>'weight_value'))::numeric;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'invalid weight_value'
      USING ERRCODE = '22007';
  END;

  -- Bypass pets RLS for this trusted insert only; ownership is still v_uid (= auth.uid()).
  SET LOCAL row_security = off;

  INSERT INTO public.pets (
    name,
    animal_type,
    breed,
    sex,
    date_of_birth,
    country,
    weight_unit,
    weight_value,
    email_id,
    microchip_number,
    passport_number,
    color,
    pet_parent_display_name,
    photo_url,
    target_weight_unit,
    target_weight_value,
    user_id
  )
  VALUES (
    v_name,
    v_animal,
    v_breed,
    v_sex,
    v_dob,
    v_country,
    v_weight_unit,
    v_weight,
    v_email_id,
    nullif(trim(p_fields->>'microchip_number'), ''),
    nullif(trim(p_fields->>'passport_number'), ''),
    nullif(trim(p_fields->>'color'), ''),
    nullif(trim(p_fields->>'pet_parent_display_name'), ''),
    nullif(trim(p_fields->>'photo_url'), ''),
    nullif(trim(p_fields->>'target_weight_unit'), ''),
    CASE
      WHEN nullif(trim(p_fields->>'target_weight_value'), '') IS NULL THEN NULL
      ELSE (nullif(trim(p_fields->>'target_weight_value'), ''))::numeric
    END,
    v_uid
  )
  RETURNING * INTO r;

  RETURN r;
END;
$$;

ALTER FUNCTION public.insert_pet_for_current_user(jsonb) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.insert_pet_for_current_user(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_pet_for_current_user(jsonb) TO authenticated;

COMMENT ON FUNCTION public.insert_pet_for_current_user(jsonb) IS
  'Creates a pet owned by auth.uid(); bypasses pets RLS for insert only. Used by consumer onboarding.';
