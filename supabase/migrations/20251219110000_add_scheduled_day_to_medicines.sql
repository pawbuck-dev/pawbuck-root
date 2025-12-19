-- Add scheduled_day column to medicines table
-- For Weekly/Bi-weekly: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- For Monthly: 1-31 (day of month)
-- For Daily/Twice Daily/Three Times Daily/As Needed: NULL (not used)

ALTER TABLE medicines ADD COLUMN scheduled_day integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN medicines.scheduled_day IS 'Day for scheduled doses. Weekly/Bi-weekly: 0-6 (Sun-Sat). Monthly: 1-31 (day of month).';
