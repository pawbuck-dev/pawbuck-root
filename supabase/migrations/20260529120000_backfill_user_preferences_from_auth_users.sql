-- One-time backfill: ensure every auth user has a public.user_preferences row (prod-safe).
-- Matches create_user_preferences behavior: insert defaults only when missing; no overwrites.

INSERT INTO public.user_preferences (user_id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_preferences p
  WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
