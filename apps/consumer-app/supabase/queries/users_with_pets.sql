-- user_id, email, profile name, and their associated pets.
-- Run in SQL Editor (service role). One row per user–pet; users with no pets appear once with NULL pet columns.

SELECT
  u.id AS user_id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ) AS profile_name,
  p.id AS pet_id,
  p.name AS pet_name,
  p.animal_type AS pet_animal_type,
  p.breed AS pet_breed,
  p.date_of_birth AS pet_dob,
  p.country AS pet_country
FROM auth.users u
LEFT JOIN public.pets p ON p.user_id = u.id AND p.deleted_at IS NULL
ORDER BY u.email, p.name;
