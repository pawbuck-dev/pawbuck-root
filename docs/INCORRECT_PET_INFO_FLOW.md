# Incorrect Pet Information Flow

This document explains how the backend OCR system should integrate with the incorrect pet information detection flow.

## Overview

When the backend OCR processes email attachments, it should validate the extracted pet information against the database records. If mismatches are detected (e.g., microchip number, pet name), the system should create a `pending_email_approvals` record with `validation_status = 'incorrect'` instead of automatically processing the document.

## Database Schema

The `pending_email_approvals` table now includes the following new fields:

- `validation_status` (text): Can be `'pending'`, `'correct'`, or `'incorrect'`
- `validation_errors` (jsonb): JSON object storing validation errors
- `document_type` (text): Type of document (e.g., `'travel_certificate'`, `'vaccination'`, `'lab_result'`, `'exam'`)
- `attachment_url` (text): URL to the attachment/document for preview

## Backend Integration Steps

### 1. After OCR Extraction

After extracting information from an attachment (vaccination, lab result, exam, etc.), validate the pet information:

```typescript
// Example validation logic
const extractedMicrochip = ocrResult.microchip_number;
const extractedPetName = ocrResult.pet_name;
const petRecord = await getPetById(petId);

const validationErrors: Record<string, string> = {};

// Check microchip number
if (petRecord.microchip_number && extractedMicrochip) {
  if (petRecord.microchip_number.toLowerCase().trim() !== extractedMicrochip.toLowerCase().trim()) {
    validationErrors.microchip_number = "Mismatch detected";
  }
}

// Check pet name
if (petRecord.name && extractedPetName) {
  if (petRecord.name.toLowerCase().trim() !== extractedPetName.toLowerCase().trim()) {
    validationErrors.pet_name = "Mismatch detected";
  }
}

// Determine validation status
const validationStatus = Object.keys(validationErrors).length > 0 ? 'incorrect' : 'correct';
```

### 2. Create Pending Approval Record

If validation errors are detected, create a `pending_email_approvals` record:

```typescript
const { data, error } = await supabase
  .from('pending_email_approvals')
  .insert({
    pet_id: petId,
    user_id: userId,
    sender_email: emailFrom,
    s3_bucket: bucketName,
    s3_key: fileKey,
    status: 'pending',
    validation_status: 'incorrect', // Mark as incorrect
    validation_errors: validationErrors, // JSON object with error details
    document_type: documentType, // e.g., 'travel_certificate', 'vaccination', etc.
    attachment_url: attachmentUrl, // URL to the document for preview
  });
```

### 3. Document Types

Use these standard document types:
- `'travel_certificate'` - Travel/health certificates
- `'vaccination'` - Vaccination certificates
- `'lab_result'` - Laboratory test results
- `'exam'` - Clinical examination records
- `'medication'` - Medication/prescription records

### 4. Validation Errors Format

The `validation_errors` field should be a JSON object with keys matching the field names that have mismatches:

```json
{
  "microchip_number": "Mismatch detected",
  "pet_name": "Mismatch detected"
}
```

### 5. If Validation Passes

If all validations pass (`validation_status = 'correct'`), you can proceed with normal processing or still create a pending approval if the sender is not whitelisted (existing flow).

## Frontend Flow

Once a record with `validation_status = 'incorrect'` is created:

1. **User sees modal** with warning icon and error details
2. **Shows specific errors** (e.g., "Microchip number doesn't match")
3. **Displays document type** (e.g., "Travel Certificate")
4. **Shows attachment preview** (if URL is available)
5. **Three action options:**
   - **Reply to Vet** - Opens email client with pre-filled message
   - **Approve Anyway** - Force process despite incorrect info
   - **Ignore** - Reject and block sender

## Example: Travel Certificate with Incorrect Microchip

```typescript
// OCR extracts microchip: "123456789012345"
// Database has microchip: "123456789012346"
// Validation detects mismatch

await supabase.from('pending_email_approvals').insert({
  pet_id: petId,
  user_id: userId,
  sender_email: 'vet@example.com',
  s3_bucket: 'emails',
  s3_key: 'path/to/email.eml',
  status: 'pending',
  validation_status: 'incorrect',
  validation_errors: {
    microchip_number: 'Mismatch detected'
  },
  document_type: 'travel_certificate',
  attachment_url: 'https://storage.supabase.co/object/public/emails/certificate.pdf'
});
```

## Email Reply Content

When user clicks "Reply to Vet", the email client opens with:

- **Subject**: `Regarding [Pet Name]'s [Document Type]`
- **Body**: Pre-filled message mentioning the specific validation errors detected

Example:
```
Hi,

I noticed that the microchip number on the Travel Certificate doesn't match the records for Max. Could you please verify and confirm the correct information?

Thank you,
[Your Name]
```

## Notes

- Always validate against the `pet_id` from the email routing (based on `email_id@pawbuck.app`)
- Only create incorrect records when there are actual mismatches - don't create them for missing optional fields
- The attachment_url should be a publicly accessible URL (signed URL from Supabase Storage)
- Consider validation strictness - you may want to allow fuzzy matching for pet names (e.g., "Max" vs "Maximus")


