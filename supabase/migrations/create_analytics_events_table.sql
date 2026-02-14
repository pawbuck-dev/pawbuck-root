-- Create analytics_events table for tracking onboarding and other events
-- This is optional - the analytics utility will work without this table

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own events (or null user_id for anonymous events)
CREATE POLICY "Users can insert their own analytics events"
  ON analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can read their own events
CREATE POLICY "Users can read their own analytics events"
  ON analytics_events
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Allow service role to read all events (for analytics dashboard)
-- This is useful for admin queries but requires service role key
-- Uncomment if you need admin access:
-- CREATE POLICY "Service role can read all analytics events"
--   ON analytics_events
--   FOR SELECT
--   USING (auth.role() = 'service_role');

-- Note: For admin/analytics dashboard access, you may want to add additional policies
-- or create a service role function to aggregate analytics data
