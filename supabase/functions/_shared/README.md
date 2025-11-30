# Shared Utilities for Supabase Edge Functions

This folder contains shared utilities that can be imported and used across all Supabase Edge Functions.

## Files

### `supabase-utils.ts`

Provides utilities for working with Supabase in Edge Functions:

- **`createSupabaseClient()`** - Creates a Supabase client with service role key
- **`getSignedImageUrl(bucket, path, expiresIn?)`** - Get a signed URL for a single image
- **`getSignedImageUrls(bucket, paths, expiresIn?)`** - Get signed URLs for multiple images
- **`downloadImage(bucket, path)`** - Download an image as ArrayBuffer
- **`getPublicImageUrl(bucket, path)`** - Get public URL (for public buckets only)
- **`arrayBufferToBase64(buffer)`** - Convert ArrayBuffer to Base64
- **`getImageAsBase64DataUrl(bucket, path, mimeType?)`** - Get image as base64 data URL

### `cors.ts`

Provides CORS utilities for Edge Functions:

- **`corsHeaders`** - Standard CORS headers object
- **`handleCorsRequest()`** - Handle OPTIONS preflight requests
- **`jsonResponse(data, status?)`** - Create JSON response with CORS headers
- **`errorResponse(error, status?)`** - Create error response with CORS headers

## Usage Examples

### Using Signed URLs

```typescript
import { getSignedImageUrl } from "../_shared/supabase-utils.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  try {
    const { bucket, path } = await req.json();
    
    // Generate signed URL with 1 hour expiry
    const signedUrl = await getSignedImageUrl(bucket, path, 3600);
    
    return jsonResponse({ url: signedUrl });
  } catch (error) {
    return errorResponse(error);
  }
});
```

### Using CORS Utilities

```typescript
import { 
  handleCorsRequest, 
  jsonResponse, 
  errorResponse 
} from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }

  try {
    const data = await processRequest(req);
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error, 500);
  }
});
```

### Working with Images

```typescript
import { 
  getImageAsBase64DataUrl,
  downloadImage 
} from "../_shared/supabase-utils.ts";

// Get image as base64 for Vision/Gemini APIs
const base64Image = await getImageAsBase64DataUrl(
  "vaccination-images", 
  "pet-123/vaccine-cert.jpg"
);

// Or download raw image data
const imageBuffer = await downloadImage(
  "vaccination-images",
  "pet-123/vaccine-cert.jpg"
);
```

## Environment Variables Required

Make sure these environment variables are set in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access

These are automatically available in Supabase Edge Functions.

