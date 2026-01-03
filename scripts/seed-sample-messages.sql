-- Seed Sample Messages SQL Script
-- 
-- This script creates sample message threads and messages for testing the messages UI.
-- 
-- Usage:
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Replace YOUR_USER_ID with your actual user ID (get it from auth.users table)
-- 3. Replace YOUR_PET_ID with one of your pet IDs (get it from pets table)
-- 4. Run this script
-- 
-- To find your user ID and pet ID:
-- SELECT id, email FROM auth.users;
-- SELECT id, name FROM pets WHERE user_id = 'YOUR_USER_ID';

-- Replace these values with your actual IDs
\set user_id 'YOUR_USER_ID_HERE'
\set pet_id 'YOUR_PET_ID_HERE'
\set user_email 'your-email@example.com'

-- Sample message threads
INSERT INTO message_threads (id, pet_id, user_id, recipient_email, recipient_name, reply_to_address, subject)
VALUES
  (
    gen_random_uuid(),
    :pet_id,
    :user_id,
    'dr.sarah.chen@happypaws.com',
    'Dr. Sarah Chen',
    'thread-' || substr(gen_random_uuid()::text, 1, 8) || '@pawbuck.app',
    'About Pet''s health'
  ),
  (
    gen_random_uuid(),
    :pet_id,
    :user_id,
    'mrivera@citypet.com',
    'Dr. Michael Rivera',
    'thread-' || substr(gen_random_uuid()::text, 1, 8) || '@pawbuck.app',
    'Follow-up appointment'
  ),
  (
    gen_random_uuid(),
    :pet_id,
    :user_id,
    'jake@pawsonthego.com',
    'Jake Thompson',
    'thread-' || substr(gen_random_uuid()::text, 1, 8) || '@pawbuck.app',
    'Dog walking request'
  ),
  (
    gen_random_uuid(),
    :pet_id,
    :user_id,
    'lisa@homepetcare.com',
    'Lisa Park',
    'thread-' || substr(gen_random_uuid()::text, 1, 8) || '@pawbuck.app',
    'Pet sitting request'
  )
ON CONFLICT (reply_to_address) DO NOTHING;

-- Get the thread IDs we just created (or existing ones)
WITH thread_data AS (
  SELECT id, recipient_email
  FROM message_threads
  WHERE user_id = :user_id AND pet_id = :pet_id
  LIMIT 4
)
-- Insert sample messages for each thread
INSERT INTO thread_messages (thread_id, direction, sender_email, recipient_email, subject, body, sent_at)
SELECT 
  t.id,
  'outbound',
  :user_email,
  t.recipient_email,
  'About Pet''s health',
  'Hi Dr. Chen, I wanted to follow up on my pet''s recent checkup. The test results came back and I have some questions.',
  NOW() - INTERVAL '5 hours'
FROM thread_data t
WHERE t.recipient_email = 'dr.sarah.chen@happypaws.com'

UNION ALL

SELECT 
  t.id,
  'inbound',
  t.recipient_email,
  :user_email,
  'About Pet''s health',
  'Hello! I''d be happy to help. What questions do you have about the test results?',
  NOW() - INTERVAL '4 hours'
FROM thread_data t
WHERE t.recipient_email = 'dr.sarah.chen@happypaws.com'

UNION ALL

SELECT 
  t.id,
  'outbound',
  :user_email,
  t.recipient_email,
  'About Pet''s health',
  'The blood work showed slightly elevated liver enzymes. Should I be concerned?',
  NOW() - INTERVAL '3 hours'
FROM thread_data t
WHERE t.recipient_email = 'dr.sarah.chen@happypaws.com'

UNION ALL

SELECT 
  t.id,
  'inbound',
  t.recipient_email,
  :user_email,
  'About Pet''s health',
  'Slightly elevated liver enzymes can be normal after certain medications or vaccinations. Since your pet had vaccinations recently, this is likely related. I recommend we retest in 2-3 weeks to monitor.',
  NOW() - INTERVAL '2 hours'
FROM thread_data t
WHERE t.recipient_email = 'dr.sarah.chen@happypaws.com'

UNION ALL

SELECT 
  t.id,
  'outbound',
  :user_email,
  t.recipient_email,
  'Follow-up appointment',
  'Hello Dr. Rivera, I need to schedule a follow-up appointment.',
  NOW() - INTERVAL '12 hours'
FROM thread_data t
WHERE t.recipient_email = 'mrivera@citypet.com'

UNION ALL

SELECT 
  t.id,
  'inbound',
  t.recipient_email,
  :user_email,
  'Follow-up appointment',
  'I can help you with that. What type of appointment are you looking for?',
  NOW() - INTERVAL '10 hours'
FROM thread_data t
WHERE t.recipient_email = 'mrivera@citypet.com'

UNION ALL

SELECT 
  t.id,
  'outbound',
  :user_email,
  t.recipient_email,
  'Dog walking request',
  'Hi Jake, can you walk my pet this afternoon?',
  NOW() - INTERVAL '1 hour'
FROM thread_data t
WHERE t.recipient_email = 'jake@pawsonthego.com'

UNION ALL

SELECT 
  t.id,
  'inbound',
  t.recipient_email,
  :user_email,
  'Dog walking request',
  'Sure thing! I can do a 30-minute walk at 3 PM. Does that work?',
  NOW() - INTERVAL '30 minutes'
FROM thread_data t
WHERE t.recipient_email = 'jake@pawsonthego.com'

UNION ALL

SELECT 
  t.id,
  'outbound',
  :user_email,
  t.recipient_email,
  'Pet sitting request',
  'Hi Lisa, I''ll be out of town next week. Can you check on my pet?',
  NOW() - INTERVAL '24 hours'
FROM thread_data t
WHERE t.recipient_email = 'lisa@homepetcare.com'

UNION ALL

SELECT 
  t.id,
  'inbound',
  t.recipient_email,
  :user_email,
  'Pet sitting request',
  'Absolutely! I can do daily check-ins. Just let me know the dates and any special instructions.',
  NOW() - INTERVAL '23 hours'
FROM thread_data t
WHERE t.recipient_email = 'lisa@homepetcare.com';

-- Update thread updated_at timestamps
UPDATE message_threads
SET updated_at = NOW()
WHERE user_id = :user_id AND pet_id = :pet_id;

