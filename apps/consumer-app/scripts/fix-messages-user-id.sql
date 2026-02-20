-- Fix Messages User ID Script
-- 
-- If you created threads with the wrong user_id, this script will help fix them.
-- 
-- Usage:
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Get your correct user_id:
--    SELECT id, email FROM auth.users;
-- 3. Run this script, replacing YOUR_USER_ID with your actual user_id

-- First, check what user_ids exist in your threads
SELECT DISTINCT user_id, COUNT(*) as thread_count
FROM message_threads
GROUP BY user_id;

-- Update all threads to use your user_id (REPLACE YOUR_USER_ID)
-- WARNING: This will change ALL threads to your user_id
-- Only run this if you're sure you want to reassign all threads to yourself
-- UPDATE message_threads 
-- SET user_id = 'YOUR_USER_ID'::uuid
-- WHERE user_id != 'YOUR_USER_ID'::uuid;

-- To fix threads for a specific pet instead:
-- UPDATE message_threads 
-- SET user_id = 'YOUR_USER_ID'::uuid
-- WHERE pet_id = 'YOUR_PET_ID'::uuid;

-- Verify the fix
-- SELECT id, recipient_name, user_id, pet_id, updated_at
-- FROM message_threads
-- WHERE user_id = 'YOUR_USER_ID'::uuid
-- ORDER BY updated_at DESC;

