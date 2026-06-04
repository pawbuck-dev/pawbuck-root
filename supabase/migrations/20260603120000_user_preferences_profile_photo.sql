-- Owner profile photo storage path (pets bucket: {user_id}/owner_profile/avatar.*)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS profile_photo_path text;

COMMENT ON COLUMN public.user_preferences.profile_photo_path IS
  'Supabase storage path in pets bucket for owner profile avatar; overrides OAuth avatar in app UI.';
