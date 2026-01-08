# Troubleshooting: Messages Not Showing

If you've added sample data but don't see messages in the app, follow these steps:

## Quick Diagnosis

### Step 1: Run the Debug Script

```bash
npx tsx scripts/debug-messages.ts
```

This will tell you:
- ✅ If threads exist in the database
- ✅ If the user_id matches your logged-in user
- ✅ If RLS policies are working
- ✅ If messages exist for the threads

### Step 2: Check SQL Directly

Run this in Supabase SQL Editor:

```sql
-- 1. Get your user ID
SELECT id, email FROM auth.users;

-- 2. Check threads in database
SELECT 
  id,
  recipient_name,
  user_id,
  pet_id,
  subject,
  updated_at
FROM message_threads
ORDER BY updated_at DESC;

-- 3. Compare user_id from step 1 with user_id from step 2
-- If they don't match, that's the problem!
```

## Common Issues & Solutions

### Issue 1: User ID Mismatch ❌

**Symptom**: Threads exist in database but don't show in app

**Cause**: Threads were created with a different `user_id` than your logged-in user

**Solution**: Update the threads to use your user_id:

```sql
-- Get your user_id first
SELECT id, email FROM auth.users;

-- Then update threads (replace YOUR_USER_ID)
UPDATE message_threads 
SET user_id = 'YOUR_USER_ID'::uuid
WHERE user_id != 'YOUR_USER_ID'::uuid;
```

### Issue 2: No Threads in Database ❌

**Symptom**: Debug script shows 0 threads

**Solution**: Re-run the seed script:
```bash
npx tsx scripts/seed-sample-messages.ts
```

Or use the SQL script in `scripts/seed-sample-messages.sql`

### Issue 3: RLS Policy Blocking ❌

**Symptom**: Error message about permissions

**Solution**: Check RLS policies are enabled:
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('message_threads', 'thread_messages');

-- Should show rowsecurity = true
```

### Issue 4: React Query Cache ❌

**Symptom**: Data exists but UI doesn't refresh

**Solution**: 
1. Pull down to refresh in the app
2. Or restart the app
3. Or clear React Query cache in dev tools

## Step-by-Step Fix

### Option A: Fix User ID (If threads exist with wrong user_id)

1. **Get your user ID**:
   ```sql
   SELECT id, email FROM auth.users;
   ```

2. **Check threads**:
   ```sql
   SELECT id, recipient_name, user_id 
   FROM message_threads;
   ```

3. **Update if user_id doesn't match**:
   ```sql
   UPDATE message_threads 
   SET user_id = 'YOUR_USER_ID_FROM_STEP_1'::uuid;
   ```

4. **Verify**:
   ```sql
   SELECT COUNT(*) 
   FROM message_threads 
   WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1'::uuid;
   ```

### Option B: Re-create Data (Clean slate)

1. **Delete existing threads**:
   ```sql
   DELETE FROM thread_messages;
   DELETE FROM message_threads;
   ```

2. **Re-run seed script**:
   ```bash
   npx tsx scripts/seed-sample-messages.ts
   ```

### Option C: Use Supabase Dashboard

1. Go to Table Editor → `message_threads`
2. Check the `user_id` column
3. If it doesn't match your user ID, update it:
   - Click on the row
   - Edit the `user_id` field
   - Set it to your user ID from `auth.users`
   - Save

## Verify It's Working

After fixing, verify:

```sql
-- This should return your threads
SELECT 
  mt.id,
  mt.recipient_name,
  mt.subject,
  COUNT(tm.id) as message_count
FROM message_threads mt
LEFT JOIN thread_messages tm ON mt.id = tm.thread_id
WHERE mt.user_id = auth.uid()
GROUP BY mt.id, mt.recipient_name, mt.subject
ORDER BY mt.updated_at DESC;
```

Then in the app:
1. Go to Messages screen
2. Make sure you're on the "Conversations" tab (not "Pending")
3. Pull down to refresh
4. You should see your threads!

## Still Not Working?

1. **Check browser/app console** for errors
2. **Check React Query DevTools** (if installed)
3. **Verify you're logged in** as the correct user
4. **Check network requests** in browser dev tools
5. **Run the debug script** and share the output

## Quick SQL to Check Everything

```sql
-- Complete diagnostic query
SELECT 
  'Threads' as type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM message_threads

UNION ALL

SELECT 
  'Messages' as type,
  COUNT(*) as count,
  COUNT(DISTINCT thread_id) as unique_threads
FROM thread_messages

UNION ALL

SELECT 
  'Your Threads' as type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM message_threads
WHERE user_id = auth.uid();
```

This shows:
- Total threads in database
- Total messages in database  
- Threads visible to you (matching your user_id)

