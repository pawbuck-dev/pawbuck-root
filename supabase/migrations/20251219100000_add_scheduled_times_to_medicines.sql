-- Add scheduled_times column to medicines table
-- This stores an array of time strings in 24-hour format (e.g., ["08:00", "20:00"])
-- representing when medication doses should be administered

ALTER TABLE medicines ADD COLUMN scheduled_times text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN medicines.scheduled_times IS 'Array of scheduled dose times in 24-hour format (HH:MM)';
