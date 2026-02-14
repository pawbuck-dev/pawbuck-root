# Bidirectional Messaging System - Implementation Status

## ✅ Completed Implementation

### 1. Email Reply Cleaner (`emailCleaner.ts`)
**Status**: ✅ Complete

- Strips quoted/replied text from email bodies
- Handles plain text and HTML formats
- Removes common reply patterns (">", "|", headers, separators)
- Multi-language support (English, French, German, Spanish)
- Integrated into email parser for automatic cleaning

**Key Functions**:
- `cleanPlainTextEmail(body)` - Removes quotes from plain text
- `cleanHtmlEmail(html)` - Removes quotes from HTML
- `cleanEmailReply(textBody, htmlBody)` - Smart cleaner that handles both formats

### 2. Thread Lookup (`threadLookup.ts`)
**Status**: ✅ Complete

- Finds threads by reply-to address
- Fallback lookup by recipient email + pet ID
- Used to link inbound emails to existing threads

**Key Functions**:
- `findThreadByReplyToAddress(replyToAddress)` - Primary lookup method
- `findThreadByRecipientAndPet(recipientEmail, petId)` - Fallback method

### 3. Message Storage (`messageStorage.ts`)
**Status**: ✅ Complete

- Stores inbound messages in `thread_messages` table
- Updates thread `updated_at` timestamp
- Handles errors gracefully (logs but doesn't fail entire request)

**Key Functions**:
- `storeInboundMessage(params)` - Stores cleaned message with metadata

### 4. Process-Pet-Mail Integration (`index.ts`)
**Status**: ✅ Complete

- Integrated thread lookup and message storage
- Stores messages even if no attachments
- Message storage happens after lock acquisition but before attachment processing
- Errors in message storage don't prevent attachment processing

**Flow**:
1. Parse email (with automatic quote cleaning)
2. Find pet by recipient email
3. Verify sender
4. Acquire processing lock
5. **NEW**: Find thread and store message (if text content exists)
6. Process attachments (existing functionality)
7. Mark as completed
8. Send notifications

## ⏳ Remaining Implementation

### 5. Service Functions (`services/messages.ts`)
**Status**: ⏳ Pending

**Needed Functions**:
```typescript
// Fetch all threads for a user (optionally filtered by pet)
fetchMessageThreads(petId?: string): Promise<MessageThread[]>

// Fetch all messages in a thread
fetchThreadMessages(threadId: string): Promise<ThreadMessage[]>

// Send a new message (may already exist, check send-message function)
sendMessage(petId, to, subject, message): Promise<{ threadId, replyToAddress }>
```

**React Query Hooks**:
```typescript
useMessageThreads(petId?: string)
useThreadMessages(threadId: string)
useSendMessage()
```

### 6. Messages UI (`app/(home)/messages.tsx`)
**Status**: ⏳ Pending

**Components Needed**:
- **Thread List View**: Display all threads with last message preview
- **Thread Detail View**: Show conversation history with messages
- **New Message Modal**: Create new threads (may already exist)

**Features**:
- List threads sorted by `updated_at` (most recent first)
- Show thread preview (recipient name, last message snippet, timestamp)
- Navigate to thread detail view
- Display messages in chronological order
- Show message direction (outbound/inbound)
- Format message bodies (support HTML or plain text)
- Real-time updates (optional, using Supabase subscriptions)

## Database Schema

### message_threads
- `id` (uuid) - Primary key
- `pet_id` (uuid) - Foreign key to pets
- `user_id` (uuid) - Foreign key to auth.users
- `recipient_email` (text) - Vet's email address
- `recipient_name` (text, nullable) - Vet's name
- `reply_to_address` (text, unique) - Unique reply-to address for thread
- `subject` (text) - Thread subject
- `created_at` (timestamp) - Thread creation time
- `updated_at` (timestamp) - Last message time (auto-updated)

### thread_messages
- `id` (uuid) - Primary key
- `thread_id` (uuid) - Foreign key to message_threads
- `direction` ("outbound" | "inbound") - Message direction
- `sender_email` (text) - Sender's email
- `recipient_email` (text) - Recipient's email
- `cc` (text[], nullable) - CC recipients
- `bcc` (text[], nullable) - BCC recipients
- `subject` (text) - Message subject
- `body` (text) - Cleaned message body (no quoted text)
- `sent_at` (timestamp) - Message timestamp

## How It Works

### Outbound Flow (User → Vet)
1. User sends message via app
2. `send-message` function:
   - Creates/finds thread in `message_threads`
   - Generates unique `reply_to_address` (format: `thread-{hash}@{domain}`)
   - Sends email via AWS SES with `Reply-To` header set to `reply_to_address`
   - Stores message in `thread_messages` (direction: "outbound")

### Inbound Flow (Vet → User)
1. Vet replies to email (reply goes to `reply_to_address`)
2. SES receives email and stores in S3
3. `process-pet-mail` function:
   - Parses email (automatic quote cleaning happens here)
   - Finds pet by recipient email (the `reply_to_address`)
   - Verifies sender (whitelist/blocklist check)
   - Finds thread by `reply_to_address`
   - Stores cleaned message in `thread_messages` (direction: "inbound")
   - Processes attachments (existing functionality)
   - Updates thread `updated_at` timestamp

## Key Features

### Email Cleaning
- **Automatic**: All inbound emails are cleaned during parsing
- **Comprehensive**: Handles multiple quote formats and languages
- **Safe**: Fallback logic prevents over-aggressive cleaning
- **Logged**: Cleaning effectiveness is logged for monitoring

### Thread Linking
- **Primary**: Match by reply-to address (most reliable)
- **Fallback**: Match by sender email + pet ID (for edge cases)
- **Graceful**: If no thread found, logs warning but continues processing

### Error Handling
- Message storage errors don't prevent attachment processing
- Thread lookup failures are logged but don't break the flow
- All errors are logged for debugging

## Testing Checklist

### Backend Testing
- [ ] Test email cleaning with various quote formats
- [ ] Test thread lookup by reply-to address
- [ ] Test thread lookup fallback (by recipient + pet)
- [ ] Test message storage with cleaned content
- [ ] Test error handling (missing thread, storage failure)
- [ ] Test end-to-end: send message, receive reply, verify storage

### Frontend Testing (When Implemented)
- [ ] Test thread list display
- [ ] Test thread detail view
- [ ] Test message sending
- [ ] Test real-time updates (if implemented)

## Next Steps

1. **Implement Service Functions** (`services/messages.ts`)
   - Create functions to fetch threads and messages
   - Add React Query hooks for data fetching

2. **Update Messages UI** (`app/(home)/messages.tsx`)
   - Create thread list component
   - Create thread detail view component
   - Integrate with service functions

3. **Optional Enhancements**
   - Real-time updates using Supabase subscriptions
   - Message search/filtering
   - Thread archiving
   - Email notification preferences

## Files Created/Modified

### New Files
- `supabase/functions/process-pet-mail/emailCleaner.ts` - Email quote cleaning
- `supabase/functions/process-pet-mail/threadLookup.ts` - Thread lookup utilities
- `supabase/functions/process-pet-mail/messageStorage.ts` - Message storage utilities
- `BIDIRECTIONAL_MESSAGING_IMPLEMENTATION.md` - Implementation guide
- `EMAIL_REPLY_CLEANING_RECOMMENDATIONS.md` - Cleaning best practices

### Modified Files
- `supabase/functions/process-pet-mail/emailParser.ts` - Integrated email cleaning
- `supabase/functions/process-pet-mail/index.ts` - Added message storage logic

## Summary

The backend implementation for bidirectional messaging is **complete and ready for testing**. The system can now:
- Clean email replies automatically
- Link inbound emails to existing threads
- Store cleaned messages in the database
- Handle errors gracefully

The remaining work is frontend-focused (service functions and UI components) to display and interact with the stored messages.

