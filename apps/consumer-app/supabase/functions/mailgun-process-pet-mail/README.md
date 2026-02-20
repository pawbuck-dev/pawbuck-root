# Mailgun Email Processing Implementation

## Overview

This implementation provides a complete email processing system for Mailgun's Store & Forward API. It handles incoming pet health records sent via email, validates them, classifies attachments using AI, and stores them in the database.

## Architecture

The implementation follows the same proven architecture as the SES-based `process-pet-mail` function, but adapted for Mailgun's webhook delivery mechanism.

### Key Differences from SES Version

| Aspect | SES (process-pet-mail) | Mailgun (mailgun-process-pet-mail) |
|--------|------------------------|-------------------------------------|
| **Authentication** | JWT Bearer token | Webhook signature (HMAC-SHA256 v3) |
| **Email Delivery** | S3 bucket → fetch raw email | Direct multipart/form-data POST |
| **Email Parsing** | postal-mime library | Custom parser for Mailgun format |
| **Idempotency Key** | S3 fileKey | Message-Id header |
| **Email Format** | Raw .eml file | Parsed fields + attachments |

## Workflow

```
Incoming Email → Mailgun Routes → Store & Forward
                                      ↓
                         POST /mailgun-process-pet-mail
                                      ↓
                         Verify Signature (HMAC-SHA256)
                                      ↓
                         Parse Multipart Form Data
                                      ↓
                         Extract: sender, recipient, subject, attachments
                                      ↓
                         Lookup Pet by Recipient Email
                                      ↓
                         Verify Sender (whitelist/blocklist)
                                      ↓
                         Check Idempotency (Message-Id)
                                      ↓
                         For Each Attachment:
                           1. Classify with Gemini AI
                           2. Validate Pet Info (microchip/attributes)
                           3. Upload to Supabase Storage
                           4. Trigger OCR Function
                           5. Save to Database
                                      ↓
                         Send Push Notifications
                                      ↓
                         Return Success Response
```

## Files Structure

```
mailgun-process-pet-mail/
├── index.ts                    # Main webhook handler
├── mailgunValidator.ts         # Signature verification (v3)
├── mailgunParser.ts            # Parse Mailgun multipart data
├── types.ts                    # TypeScript interfaces
├── petLookup.ts               # Database pet queries
├── geminiClassifier.ts        # AI document classification
├── storageUploader.ts         # Supabase Storage uploads
├── ocrTrigger.ts              # OCR function invocation
├── petValidator.ts            # Pet info extraction & validation
├── idempotencyChecker.ts      # Duplicate processing prevention
├── emailListChecker.ts        # Sender whitelist/blocklist
├── dbPersistence.ts           # Save OCR results to DB
├── deno.json                  # Dependencies configuration
└── handlers/
    ├── index.ts                    # Handler exports
    ├── senderVerification.ts       # Sender approval workflow
    ├── attachmentProcessor.ts      # Attachment pipeline
    ├── responseBuilder.ts          # HTTP response helpers
    └── notificationSender.ts       # Push notifications
```

## Security: Webhook Signature Verification

Mailgun signs all webhooks using HMAC-SHA256. The signature verification process:

1. Extract `timestamp`, `token`, and `signature` from POST body
2. Check timestamp freshness (reject if >15 minutes old)
3. Compute HMAC-SHA256 of `timestamp + token` using `MAILGUN_SECRET`
4. Compare computed signature with provided signature
5. Reject request if signatures don't match (401 Unauthorized)

### Why Signature Verification is Critical

Without signature verification, attackers could:
- Spoof emails to inject malicious attachments
- Bypass sender whitelist/blocklist
- Trigger unauthorized database writes
- Spam users with fake notifications

## Mailgun Webhook Format

Mailgun sends emails as `multipart/form-data` with these fields:

### Required Fields
- `timestamp` - Unix timestamp for signature verification
- `token` - Random token for signature verification
- `signature` - HMAC-SHA256 signature
- `sender` - From address (e.g., "vet@clinic.com" or "Dr. Smith <vet@clinic.com>")
- `recipient` - To address (e.g., "fluffy123@pets.pawbuck.com")
- `subject` - Email subject line
- `Message-Id` - Unique message identifier (for idempotency)

### Optional Fields
- `body-plain` - Plain text body
- `body-html` - HTML body
- `Date` - Email date
- `Cc` - CC recipients
- `attachments` - JSON array string containing attachment metadata and storage URLs
  ```json
  [
    {
      "url": "https://storage-us-east4.api.mailgun.net/v3/domains/.../attachments/0",
      "content-type": "application/pdf",
      "name": "results.pdf",
      "size": 12345
    },
    {
      "url": "https://storage-us-east4.api.mailgun.net/v3/domains/.../attachments/1",
      "content-type": "image/jpeg",
      "name": "xray.jpg",
      "size": 67890
    }
  ]
  ```

## Processing Steps

### 1. Signature Verification
```typescript
const signatureFields = extractSignatureFields(formData);
const isValid = await verifyMailgunSignature(
  signatureFields.timestamp,
  signatureFields.token,
  signatureFields.signature,
  mailgunSecret
);
```

### 2. Email Parsing & Attachment Handling

The parser automatically handles Mailgun's attachment format:

**Mailgun Store & Forward Format:**
```typescript
// Mailgun sends attachments as a JSON array string in the "attachments" field:
[
  {
    "url": "https://storage-us-east4.api.mailgun.net/v3/.../attachments/0",
    "content-type": "application/pdf",
    "name": "results.pdf",
    "size": 12345
  },
  {
    "url": "https://storage-us-east4.api.mailgun.net/v3/.../attachments/1",
    "content-type": "image/jpeg",
    "name": "xray.jpg",
    "size": 67890
  }
]

// Parser:
// 1. Parses the JSON array string
// 2. Iterates through each attachment object
// 3. Fetches from storage URL using MAILGUN_API_KEY
// 4. Converts to base64 for processing
```

The parser uses HTTP Basic Authentication to fetch from storage:
- Username: `api`
- Password: Your `MAILGUN_API_KEY`

This all happens automatically - you don't need to handle it separately.

### 3. Pet Lookup
```typescript
const pet = await findPetByEmail(recipientEmail);
// Looks up pet by email_id: "fluffy123@pets.pawbuck.com" → "fluffy123"
```

### 4. Sender Verification
```typescript
const verification = await verifySender(pet, senderEmail, mailgunConfig, emailInfo);
// Returns:
// - whitelisted: proceed with processing
// - blocked: 403 response
// - unknown: save pending approval, send notification, 202 response
```

### 5. Idempotency Check
```typescript
const lockResult = await tryAcquireProcessingLock(messageId);
// Uses Message-Id to prevent duplicate processing
// Returns: acquired (true/false) and status (processing/completed)
```

### 6. Attachment Processing
For each attachment:
```typescript
// a) Classify with Gemini AI
const classification = await classifyAttachment(attachment, subject, body);
// Returns: medications | lab_results | clinical_exams | vaccinations | irrelevant

// b) Validate pet info
const validation = await validatePetFromDocument(attachment, subject, pet);
// Checks: microchip (exact match) OR attributes (name/age/breed/gender fuzzy match)

// c) Upload to storage
const storagePath = await uploadAttachment(pet, docType, filename, content, mimeType);
// Path: {user_id}/pet_{name}_{id}/{doc_type}/email_{timestamp}_{filename}

// d) Trigger OCR
const ocrResult = await triggerOCR(docType, "pets", storagePath);
// Calls: medication-ocr, lab-results-ocr, clinical-exam-ocr, vaccination-ocr

// e) Save to database
const saveResult = await saveOCRResults(docType, pet, storagePath, ocrData);
// Inserts into: medicines, lab_results, clinical_exams, vaccinations tables
```

### 7. Notifications
```typescript
// Success notification
await sendProcessedNotification(pet, emailInfo, processedAttachments);
// Title: "New Health Records Added for {pet}"
// Body: "{count} new {types} records have been added from {sender}"

// Skipped attachments notification
await sendSkippedAttachmentsNotification(pet, emailInfo, skippedAttachments);
// Title: "Documents Skipped for {pet}"
// Body: "{count} documents were skipped because the pet could not be verified"

// Failure notification
await sendFailedNotification(pet, senderEmail);
// Title: "Email Processing Failed for {pet}"
// Body: "Failed to process email from {sender}"
```

## Environment Variables

### Required
- `MAILGUN_SECRET` - Webhook signing key (for signature verification)
- `MAILGUN_API_KEY` - Private API key (for fetching attachments from storage)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database/storage
- `GOOGLE_GEMINI_API_KEY` - For AI classification and pet validation

### Shared with Other Functions
These should already be configured if you have the SES version running:
- Notification service credentials
- Database connection settings
- Storage bucket configuration

## Mailgun Configuration

### 1. Create Route in Mailgun Dashboard

Navigate to Sending → Routes → Create Route:

**Expression:**
```
match_recipient(".*@pets.pawbuck.com")
```

**Actions:**
```
store(notify="https://your-project.supabase.co/functions/v1/mailgun-process-pet-mail")
```

**Priority:** 0 (highest)

### 2. Get API Keys

Navigate to Settings → Security & Users → API Security

**Webhook Signing Key:**
- Copy the "HTTP webhook signing key"
- Set it as `MAILGUN_SECRET` environment variable

**Private API Key:**
- Copy your "Private API key" (starts with `key-...`)
- Set it as `MAILGUN_API_KEY` environment variable
- This is used to fetch attachments from Mailgun storage

### 3. Test Webhook

Send a test email:
```bash
curl -s --user 'api:YOUR_API_KEY' \
  https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
  -F from='vet@clinic.com' \
  -F to='fluffy123@pets.pawbuck.com' \
  -F subject='Test Lab Results' \
  -F text='Please see attached lab results' \
  -F attachment=@test-results.pdf
```

## Testing Locally

### 1. Start Supabase
```bash
supabase start
```

### 2. Set Environment Variables
```bash
export MAILGUN_SECRET="your-webhook-signing-key"
export MAILGUN_API_KEY="key-your-private-api-key"
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
export GOOGLE_GEMINI_API_KEY="your-gemini-key"
```

### 3. Generate Test Signature
```typescript
// Run this in Deno to generate a valid signature
import { crypto } from "https://deno.land/std/crypto/mod.ts";

const timestamp = Math.floor(Date.now() / 1000).toString();
const token = crypto.randomUUID();
const secret = "your-mailgun-secret";

const encoder = new TextEncoder();
const keyData = encoder.encode(secret);
const messageData = encoder.encode(timestamp + token);

const key = await crypto.subtle.importKey(
  "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
);

const signature = await crypto.subtle.sign("HMAC", key, messageData);
const hex = Array.from(new Uint8Array(signature))
  .map(b => b.toString(16).padStart(2, '0')).join('');

console.log(`timestamp: ${timestamp}`);
console.log(`token: ${token}`);
console.log(`signature: ${hex}`);
```

### 4. Send Test Request
```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/mailgun-process-pet-mail' \
  -F "timestamp=GENERATED_TIMESTAMP" \
  -F "token=GENERATED_TOKEN" \
  -F "signature=GENERATED_SIGNATURE" \
  -F "sender=vet@clinic.com" \
  -F "recipient=fluffy123@pets.pawbuck.com" \
  -F "subject=Lab Results" \
  -F "body-plain=See attached results" \
  -F "Message-Id=<test-$(date +%s)@mailgun.com>" \
  -F "attachment-1=@/path/to/test-file.pdf"
```

## Response Format

### Success (200 OK)
```json
{
  "success": true,
  "pet": {
    "id": "uuid",
    "name": "Fluffy",
    "email_id": "fluffy123",
    "user_id": "uuid"
  },
  "email": {
    "from": "vet@clinic.com",
    "subject": "Lab Results",
    "date": "2024-01-08"
  },
  "processedAttachments": [
    {
      "filename": "results.pdf",
      "mimeType": "application/pdf",
      "size": 12345,
      "classification": {
        "type": "lab_results",
        "confidence": 0.95,
        "reasoning": "Lab results document"
      },
      "uploaded": true,
      "storagePath": "user-id/pet_fluffy_id/lab_results/email_1234567890_results.pdf",
      "ocrTriggered": true,
      "ocrSuccess": true,
      "dbInserted": true,
      "dbRecordIds": ["record-id"],
      "petValidation": {
        "isValid": true,
        "method": "microchip",
        "extractedInfo": { ... },
        "matchDetails": { ... }
      }
    }
  ]
}
```

### Already Processed (200 OK)
```json
{
  "success": true,
  "message": "Email already processed",
  "status": "completed",
  "messageId": "<message@mailgun.com>"
}
```

### Pending Approval (202 Accepted)
```json
{
  "success": true,
  "status": "pending_approval",
  "message": "Email from unknown sender requires user approval",
  "pendingApprovalId": "uuid",
  "pet": { ... },
  "email": { ... }
}
```

### Blocked Sender (403 Forbidden)
```json
{
  "success": false,
  "status": "blocked",
  "message": "Email from sender@email.com is blocked for this pet",
  "pet": { ... },
  "email": { ... }
}
```

### Invalid Signature (401 Unauthorized)
```json
{
  "success": false,
  "error": "Invalid webhook signature"
}
```

### Pet Not Found (404 Not Found)
```json
{
  "success": false,
  "error": "No pet found with email address: unknown@pets.pawbuck.com"
}
```

### Server Error (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Error message details"
}
```

## Monitoring & Debugging

### Logs to Watch

1. **Signature Verification**
   - ✅ "Mailgun signature verified successfully"
   - ❌ "Invalid Mailgun signature - rejecting request"
   - ❌ "Timestamp too old: {seconds} seconds"

2. **Email Parsing**
   - "Email parsed: { from, to, subject, attachmentCount }"
   - "Extracted {N} attachment(s) from Mailgun webhook"

3. **Pet Lookup**
   - ✅ "Found pet: {name} (ID: {id})"
   - ❌ "No pet found with email_id: {id}"

4. **Sender Verification**
   - ✅ "Sender {email} is whitelisted - proceeding"
   - ⚠️ "Sender {email} is unknown - saving for user approval"
   - ❌ "Sender {email} is blocked - skipping processing"

5. **Idempotency**
   - ✅ "Acquired processing lock for: {messageId}"
   - ⏭️ "Email already processed: {messageId} - skipping"

6. **Attachment Processing**
   - "Classification result: {type} (confidence: {score})"
   - ✅ "Pet validated via {method}: proceeding with processing"
   - ❌ "Skipping attachment: {reason}"
   - "Upload successful: {path}"
   - "OCR completed successfully"
   - "DB insert successful: {count} record(s) inserted"

## Troubleshooting

### Issue: "Invalid webhook signature"
**Cause:** Wrong MAILGUN_SECRET or expired timestamp
**Solution:**
- Verify MAILGUN_SECRET matches your Mailgun dashboard
- Check server time is synchronized (NTP)
- Ensure request is not older than 15 minutes

### Issue: "No pet found with email address"
**Cause:** Pet email_id doesn't match recipient local part
**Solution:**
- Verify pet's email_id in database
- Email format: `{email_id}@pets.pawbuck.com`
- Check for typos in recipient address

### Issue: "Sender requires approval" but it's a known vet
**Cause:** Sender email not in pet_email_list
**Solution:**
- User must approve from app first time
- Or manually add to pet_email_list table:
  ```sql
  INSERT INTO pet_email_list (pet_id, user_id, email_id, is_blocked)
  VALUES ('{pet_id}', '{user_id}', 'vet@clinic.com', false);
  ```

### Issue: "No attachments to process"
**Cause:** Mailgun not sending attachments in webhook
**Solution:**
- Verify Mailgun route uses `store(notify="...")` not just `forward()`
- Check email actually has attachments
- Look for `attachment-1`, `attachment-2` fields in logs
- Check if attachments are coming as storage URLs (they should with Store & Forward)

### Issue: "Failed to fetch attachment from Mailgun"
**Cause:** Wrong MAILGUN_API_KEY or expired storage URL
**Solution:**
- Verify MAILGUN_API_KEY is your **Private API key** (not webhook signing key)
- Key should start with `key-...`
- Check Mailgun dashboard: Settings → API Keys
- Storage URLs expire after 3-30 days depending on your plan
- Ensure the API key has access to the domain `pawbuck.app`

### Issue: Duplicate processing
**Cause:** Mailgun retry after timeout
**Solution:**
- Idempotency checker handles this automatically
- Check processed_emails table for status
- If status="processing" for >5 minutes, may be stuck

### Issue: Pet validation failing
**Cause:** Microchip or attributes don't match
**Solution:**
- Check petValidation details in response
- Verify microchip_number in pet record
- Check extracted info matches pet (name/breed/age/gender)
- May need to update pet record or vet needs to correct document

## Performance Considerations

### Processing Time
- Signature verification: ~1ms
- Email parsing: ~10-50ms (depends on attachment count/size)
- Pet lookup: ~10-20ms
- Sender verification: ~10-20ms
- Per attachment:
  - Gemini classification: ~1-3 seconds
  - Pet validation: ~1-3 seconds
  - Upload to storage: ~100-500ms
  - OCR function: ~5-15 seconds
  - DB insert: ~50-100ms

**Total:** ~10-25 seconds per attachment

### Optimization Tips
1. **Parallel Processing:** Attachments processed sequentially (easy to parallelize if needed)
2. **Caching:** Consider caching pet lookups for high-volume senders
3. **Async Notifications:** Notifications sent but errors don't fail the request
4. **Idempotency:** Prevents wasted processing on retries

## Migration from SES

If you're migrating from the SES version:

1. ✅ **Database schema unchanged** - Same tables, same structure
2. ✅ **Storage paths compatible** - Can coexist with SES uploads
3. ✅ **Notifications unchanged** - Same push notification format
4. ⚠️ **Idempotency table** - Uses same `processed_emails` table but different keys
5. ⚠️ **Pending approvals** - Uses same `pending_email_approvals` table

Both functions can run simultaneously without conflicts.

## Future Enhancements

Potential improvements:
- [ ] Parallel attachment processing for faster throughput
- [ ] Webhook retry handling with exponential backoff
- [ ] Email bounce/complaint webhooks
- [ ] Attachment size limits and validation
- [ ] Support for inline images in email body
- [ ] Email threading (In-Reply-To, References headers)
- [ ] Spam score checking
- [ ] Virus scanning integration

## Support

For issues or questions:
1. Check logs in Supabase Dashboard → Edge Functions → mailgun-process-pet-mail
2. Review this documentation
3. Test with curl command to isolate issues
4. Verify environment variables are set correctly
5. Check Mailgun logs for webhook delivery status

