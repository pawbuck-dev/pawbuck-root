-- Quick Check Script for Messages
-- Run this in Supabase SQL Editor to diagnose why messages aren't showing

-- 1. Check if threads exist
SELECT 
  COUNT(*) as total_threads,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT pet_id) as unique_pets
FROM message_threads;

-- 2. See all threads with user_ids
SELECT 
  id,
  recipient_name,
  recipient_email,
  subject,
  user_id,
  pet_id,
  updated_at,
  created_at
FROM message_threads
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Check if messages exist
SELECT 
  COUNT(*) as total_messages,
  COUNT(DISTINCT thread_id) as threads_with_messages
FROM thread_messages;

-- 4. Get your current user_id (run this while logged in)
-- Replace YOUR_EMAIL with your email address
SELECT id, email 
FROM auth.users 
WHERE email = 'YOUR_EMAIL';

-- 5. Check threads for a specific user (replace USER_ID)
-- This shows what threads your user can see
SELECT 
  mt.id,
  mt.recipient_name,
  mt.subject,
  mt.user_id,
  COUNT(tm.id) as message_count,
  MAX(tm.sent_at) as last_message_time
FROM message_threads mt
LEFT JOIN thread_messages tm ON mt.id = tm.thread_id
WHERE mt.user_id = 'USER_ID_HERE'
GROUP BY mt.id, mt.recipient_name, mt.subject, mt.user_id
ORDER BY mt.updated_at DESC;

-- 6. Check if RLS is blocking access
-- This should return your user_id if RLS is working
SELECT auth.uid() as current_user_id;

-- 7. Fix user_id if threads were created with wrong user_id
-- REPLACE 'CORRECT_USER_ID' with your actual user_id from step 4
-- REPLACE 'WRONG_USER_ID' with the user_id from step 2 (if different)
-- UNCOMMENT TO RUN:
-- UPDATE message_threads 
-- SET user_id = 'CORRECT_USER_ID'::uuid
-- WHERE user_id = 'WRONG_USER_ID'::uuid;

-- 8. Verify threads are visible (after fix)
-- This should match step 5 after fixing user_id
SELECT 
  id,
  recipient_name,
  subject,
  user_id,
  updated_at
FROM message_threads
WHERE user_id = auth.uid()
ORDER BY updated_at DESC;

