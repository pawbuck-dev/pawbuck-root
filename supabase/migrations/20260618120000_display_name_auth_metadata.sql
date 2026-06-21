-- Improve display_name_for_user to prefer OAuth metadata over email local-part.
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
        NULLIF(btrim(u.raw_user_meta_data->>'full_name'), ''),
        NULLIF(btrim(u.raw_user_meta_data->>'name'), ''),
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
