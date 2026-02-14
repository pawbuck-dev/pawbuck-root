# Bidirectional Messaging System Implementation

## Overview
This document outlines the implementation of a bidirectional messaging system between app users and vets using Amazon SES.

## Current Status

### ✅ Already Implemented
1. **Outbound Messaging**: `send-message` function sends emails via AWS SES
2. **Database Schema**: `message_threads` and `thread_messages` tables exist
3. **Email Cleaner**: Utility to strip quoted/replied text from email bodies
4. **Thread Creation**: Outbound messages create/use threads with unique reply-to addresses

### ⏳ To Implement

#### 1. Thread Lookup by Reply-To Address
- **File**: `supabase/functions/process-pet-mail/threadLookup.ts` ✅ Created
- **Status**: Created, needs integration

#### 2. Store Inbound Text Messages
- **File**: `supabase/functions/process-pet-mail/index.ts`
- **Changes Needed**:
  - Find thread by reply-to address (from email "To" field)
  - Store text message in `thread_messages` table
  - Update thread `updated_at` timestamp
  - Handle cases where thread doesn't exist (new conversation)

#### 3. Service Functions for Frontend
- **File**: `services/messages.ts` (to create)
- **Functions Needed**:
  - `fetchMessageThreads(petId?: string)` - Get all threads for user/pet
  - `fetchThreadMessages(threadId: string)` - Get messages in a thread
  - `sendMessage(petId, to, subject, message)` - Send new message (may already exist)

#### 4. UI Updates
- **File**: `app/(home)/messages.tsx`
- **Changes Needed**:
  - Display threads instead of just pending approvals
  - Show thread list with last message preview
  - Create thread detail view component
  - Integrate with service functions

## Implementation Plan

### Step 1: Update process-pet-mail to Store Messages
1. Import thread lookup functions
2. Find thread by reply-to address (from "To" field)
3. Store cleaned text message in `thread_messages` table
4. Update thread timestamp
5. Handle new conversations (no thread found)

### Step 2: Create Service Functions
1. Create `services/messages.ts`
2. Implement thread fetching functions
3. Implement message fetching functions
4. Add React Query hooks

### Step 3: Update Messages UI
1. Update messages page to fetch and display threads
2. Create thread list component
3. Create thread detail view component
4. Add navigation between list and detail views

### Step 4: Testing
1. Test outbound message creation
2. Test inbound message storage
3. Test thread linking
4. Test UI display

## Email Flow

### Outbound (User → Vet)
1. User sends message via app
2. `send-message` function:
   - Creates/finds thread
   - Generates unique reply-to address
   - Sends email via SES with reply-to header
   - Stores message in `thread_messages` (direction: "outbound")

### Inbound (Vet → User)
1. Vet replies to email (reply-to address in "To" field)
2. SES receives email and stores in S3
3. `process-pet-mail` function:
   - Parses email
   - Cleans quoted text
   - Finds thread by reply-to address
   - Stores message in `thread_messages` (direction: "inbound")
   - Processes attachments (existing functionality)

## Database Schema

### message_threads
- `id` (uuid)
- `pet_id` (uuid)
- `user_id` (uuid)
- `recipient_email` (text)
- `recipient_name` (text, nullable)
- `reply_to_address` (text, unique) - Used to link replies
- `subject` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### thread_messages
- `id` (uuid)
- `thread_id` (uuid)
- `direction` ("outbound" | "inbound")
- `sender_email` (text)
- `recipient_email` (text)
- `cc` (text[], nullable)
- `bcc` (text[], nullable)
- `subject` (text)
- `body` (text) - Cleaned text (no quotes)
- `sent_at` (timestamp)

## Key Implementation Details

### Reply-To Address Format
- Format: `thread-{hash}@{domain}`
- Hash is derived from thread ID
- Stored in `message_threads.reply_to_address`
- Used to link inbound emails to threads

### Email Cleaning
- All inbound emails are cleaned to remove quoted text
- Cleaning happens in `emailParser.ts`
- Both text and HTML bodies are cleaned
- Cleaned content is stored in database

### Thread Matching
1. Primary: Match by reply-to address (from email "To" field)
2. Fallback: Match by recipient email + pet ID (for new conversations)

### Error Handling
- If thread not found, log warning but still process attachments
- If message storage fails, log error but don't fail entire request
- Always process attachments even if thread lookup fails

