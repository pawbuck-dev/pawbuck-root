-- Avoid exception text "not authenticated" on insert_pet_for_current_user when auth.uid()
-- is null; clients must not misread it as a Supabase JWT/session expiry.

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
  v_weight_unit text := nullif(trim(p_fields->>'weight_unit'), '');
  v_email_id text := lower(trim(p_fields->>'email_id'));
  v_dob date;
  v_weight numeric;
  v_dob_raw text := nullif(trim(p_fields->>'date_of_birth'), '');
  v_weight_raw text := nullif(trim(p_fields->>'weight_value'), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'pet_insert_missing_auth_uid'
      USING ERRCODE = '28000';
  END IF;

  IF v_name = '' OR v_animal = '' OR v_breed = '' OR v_sex = '' OR v_country = '' OR v_email_id = '' THEN
    RAISE EXCEPTION 'missing required pet fields'
      USING ERRCODE = '23502';
  END IF;

  IF v_dob_raw IS NOT NULL THEN
    BEGIN
      v_dob := v_dob_raw::timestamptz::date;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid date_of_birth'
        USING ERRCODE = '22007';
    END;
  ELSE
    v_dob := NULL;
  END IF;

  IF v_weight_raw IS NOT NULL THEN
    BEGIN
      v_weight := v_weight_raw::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid weight_value'
        USING ERRCODE = '22007';
    END;
  ELSE
    v_weight := NULL;
  END IF;

  IF (v_weight IS NOT NULL AND v_weight_unit IS NULL) OR (v_weight IS NULL AND v_weight_unit IS NOT NULL) THEN
    RAISE EXCEPTION 'weight_value and weight_unit must both be set or both omitted'
      USING ERRCODE = '23514';
  END IF;

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

COMMENT ON FUNCTION public.insert_pet_for_current_user(jsonb) IS
  'Creates a pet owned by auth.uid(); bypasses pets RLS for insert only. date_of_birth and weight may be null when skipped during onboarding.';
