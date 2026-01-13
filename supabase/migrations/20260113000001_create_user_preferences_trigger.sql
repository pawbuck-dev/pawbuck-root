-- Create a function to create user_preferences for a user
-- This function uses SECURITY DEFINER to bypass RLS policies
-- It can be called from the client during signup when the session might not be established
CREATE OR REPLACE FUNCTION public.create_user_preferences(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, vaccination_reminder_days)
  VALUES (p_user_id, 14)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Grant execute permission on the function to authenticated and anon users
-- This allows it to be called during signup before the session is fully established
GRANT EXECUTE ON FUNCTION public.create_user_preferences(UUID) TO authenticated, anon;

