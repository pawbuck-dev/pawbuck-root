# Sample Messages Seeding Scripts

This directory contains scripts to populate your database with sample message threads and messages for testing the messages UI.

## Option 1: TypeScript Script (Recommended)

### Prerequisites
- Node.js installed
- Logged into your Supabase project
- At least one pet in your database

### Usage

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Set up authentication**:
   - The script uses your current Supabase session
   - You need to be logged in to your app first, OR
   - You can use the SQL script instead (Option 2)

3. **Run the script**:
   ```bash
   npx tsx scripts/seed-sample-messages.ts
   ```

The script will:
- ✅ Authenticate using your current session
- ✅ Find your first pet
- ✅ Create 4 sample message threads
- ✅ Create multiple messages in each thread
- ✅ Set realistic timestamps

### Sample Data Created

The script creates:
- **4 threads** with different recipients:
  - Dr. Sarah Chen (Veterinarian)
  - Dr. Michael Rivera (Veterinarian)
  - Jake Thompson (Dog Walker)
  - Lisa Park (Pet Sitter)

- **Multiple messages per thread** with realistic conversations about:
  - Health checkups and test results
  - Appointment scheduling
  - Dog walking requests
  - Pet sitting arrangements

## Option 2: SQL Script

### Usage

1. **Open Supabase Dashboard**:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Find your User ID and Pet ID**:
   ```sql
   -- Get your user ID
   SELECT id, email FROM auth.users;
   
   -- Get your pet ID
   SELECT id, name FROM pets WHERE user_id = 'YOUR_USER_ID';
   ```

3. **Update the script**:
   - Open `scripts/seed-sample-messages.sql`
   - Replace `YOUR_USER_ID_HERE` with your user ID
   - Replace `YOUR_PET_ID_HERE` with your pet ID
   - Replace `your-email@example.com` with your email

4. **Run the SQL script**:
   - Copy the contents of `scripts/seed-sample-messages.sql`
   - Paste into SQL Editor
   - Replace the variables with your values
   - Execute the script

## Option 3: Manual Insert via Supabase Dashboard

If you prefer a more interactive approach:

1. Go to Supabase Dashboard → Table Editor
2. Open `message_threads` table
3. Click "Insert" → "Insert row"
4. Fill in:
   - `pet_id`: Your pet ID
   - `user_id`: Your user ID
   - `recipient_email`: Any email (e.g., `dr.smith@vet.com`)
   - `recipient_name`: Name (e.g., `Dr. Smith`)
   - `reply_to_address`: `thread-abc123@pawbuck.app` (must be unique)
   - `subject`: Any subject (e.g., `About Luna's health`)

5. Open `thread_messages` table
6. Click "Insert" → "Insert row"
7. Fill in:
   - `thread_id`: The thread ID from step 4
   - `direction`: `outbound` or `inbound`
   - `sender_email`: Your email or recipient email
   - `recipient_email`: Recipient email or your email
   - `subject`: Thread subject
   - `body`: Message text
   - `sent_at`: Timestamp

## Verifying Sample Data

After running either script, verify the data:

```sql
-- Check threads
SELECT 
  mt.id,
  mt.recipient_name,
  mt.subject,
  mt.updated_at,
  COUNT(tm.id) as message_count
FROM message_threads mt
LEFT JOIN thread_messages tm ON mt.id = tm.thread_id
WHERE mt.user_id = 'YOUR_USER_ID'
GROUP BY mt.id, mt.recipient_name, mt.subject, mt.updated_at
ORDER BY mt.updated_at DESC;

-- Check messages in a thread
SELECT 
  tm.*,
  mt.recipient_name
FROM thread_messages tm
JOIN message_threads mt ON tm.thread_id = mt.id
WHERE mt.id = 'THREAD_ID_HERE'
ORDER BY tm.sent_at ASC;
```

## Troubleshooting

### "You must be logged in" error (TypeScript script)
- **Solution**: Use the SQL script instead, or log in through your app first

### "You need at least one pet" error
- **Solution**: Create a pet in your app first, then run the script again

### Duplicate key errors
- **Solution**: The script will skip existing threads. If you want fresh data, delete existing threads first:
  ```sql
  DELETE FROM thread_messages WHERE thread_id IN (
    SELECT id FROM message_threads WHERE user_id = 'YOUR_USER_ID'
  );
  DELETE FROM message_threads WHERE user_id = 'YOUR_USER_ID';
  ```

### Messages not showing in UI
- Check that:
  - You're logged in as the correct user
  - The threads have `user_id` matching your user
  - The threads have messages (check `thread_messages` table)
  - You're viewing the "Conversations" tab (not "Pending")

## Cleaning Up Sample Data

To remove all sample messages:

```sql
-- Delete all messages for your user
DELETE FROM thread_messages 
WHERE thread_id IN (
  SELECT id FROM message_threads WHERE user_id = 'YOUR_USER_ID'
);

-- Delete all threads for your user
DELETE FROM message_threads 
WHERE user_id = 'YOUR_USER_ID';
```

## Next Steps

After seeding sample data:
1. Open your app
2. Navigate to the Messages screen
3. You should see 4 conversations in the list
4. Tap on a conversation to see the message thread
5. Try sending a reply to test the reply functionality

