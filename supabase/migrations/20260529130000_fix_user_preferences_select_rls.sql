-- Fix broken SELECT policy: compared auth.uid() to row primary key "id" instead of "user_id".
-- Without this, .upsert(...).select().single() fails after write and clients log RLS errors in a loop.

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
