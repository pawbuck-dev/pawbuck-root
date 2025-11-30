# Vaccination OCR Utilities

This module provides utilities for processing vaccination certificates using OCR (Optical Character Recognition) and AI parsing.

## Features

- Upload images to Supabase Storage
- Automatic signed URL generation for secure access
- OCR text extraction using Google Vision API
- AI-powered vaccination data parsing using Google Gemini
- Support for multiple date formats and languages

## Usage in React Native App

### 1. Process an Image Already in Supabase Storage

```typescript
import { processVaccinationImage } from "@/utils/vaccinationOCR";

const result = await processVaccinationImage(
  "vaccination-images", // bucket name
  "pet-123/vaccine-cert.jpg" // file path
);

if (result.error) {
  console.error("Error:", result.error);
} else {
  console.log("Found vaccines:", result.vaccines);
  // result.vaccines is an array of VaccinationRecord
}
```

### 2. Upload and Process an Image in One Step

```typescript
import { uploadAndProcessVaccinationImage } from "@/utils/vaccinationOCR";

// After picking an image with expo-image-picker
const result = await uploadAndProcessVaccinationImage(
  imageUri, // local file URI
  petId // pet ID for organizing storage
);

if (!result.error) {
  result.vaccines.forEach((vaccine) => {
    console.log(`Vaccine: ${vaccine.vaccine_name}`);
    console.log(`Given: ${vaccine.vaccination_date}`);
    console.log(`Next due: ${vaccine.next_due_date}`);
  });
}
```

### 3. Process an External Image URL

```typescript
import { processVaccinationImageFromUrl } from "@/utils/vaccinationOCR";

const result = await processVaccinationImageFromUrl(
  "https://example.com/vaccine-cert.jpg"
);
```

## Response Format

```typescript
interface VaccinationRecord {
  vaccine_name: string; // e.g., "Nobivac DHPPi"
  vaccination_date: string; // ISO format: "2024-03-15"
  next_due_date?: string; // ISO format: "2025-03-15"
  vet_clinic_name?: string; // e.g., "Happy Paws Veterinary"
  notes?: string; // Batch numbers, lot numbers, etc.
}

interface VaccinationOCRResponse {
  vaccines: VaccinationRecord[];
  error?: string;
}
```

## Example Integration with Upload Modal

Here's how you might integrate this into the vaccination upload modal:

```typescript
import { uploadAndProcessVaccinationImage } from "@/utils/vaccinationOCR";

const handleUploadAndProcess = async (imageUri: string) => {
  try {
    setLoading(true);
    
    // Upload and process the image
    const result = await uploadAndProcessVaccinationImage(
      imageUri,
      pet.id
    );
    
    if (result.error) {
      Alert.alert("Error", result.error);
      return;
    }
    
    if (result.vaccines.length === 0) {
      Alert.alert(
        "No Vaccines Found",
        "Could not extract vaccination data from this image. Please try a clearer photo."
      );
      return;
    }
    
    // Show the extracted vaccines for review
    setExtractedVaccines(result.vaccines);
    setShowReviewModal(true);
    
  } catch (error) {
    console.error("Error:", error);
    Alert.alert("Error", "Failed to process vaccination certificate");
  } finally {
    setLoading(false);
  }
};
```

## Supabase Edge Function

The vaccination OCR processing is handled by a Supabase Edge Function located at:
`supabase/functions/vaccination-ocr/`

### Shared Utilities

The Edge Function uses shared utilities from:
`supabase/functions/_shared/`

- **supabase-utils.ts** - Supabase Storage utilities including signed URL generation
- **cors.ts** - CORS headers and response helpers

### Environment Variables Required

Make sure these are set in your Supabase project:

- `GOOGLE_VISION_API_KEY` - For OCR text extraction
- `GOOGLE_GEMINI_API_KEY` - For AI-powered data parsing
- `SUPABASE_URL` - Automatically provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided by Supabase

## Supported Features

- **Languages**: English, French, and other European languages
- **Date Formats**: DD/MM/YYYY, DD/MM/YY, MM/DD/YYYY, YYYY-MM-DD
- **Document Types**: Vaccination certificates, veterinary records
- **Fields Extracted**: 
  - Vaccine name/product
  - Vaccination date
  - Next due date (expiry)
  - Veterinary clinic name
  - Batch/lot numbers

## Error Handling

The utilities include comprehensive error handling:

- Upload failures
- OCR processing errors
- API errors
- Invalid image formats
- No text found in image
- Failed to parse vaccination data

All errors are returned in the `error` field of the response object.

