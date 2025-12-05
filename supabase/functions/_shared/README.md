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

### `notification.ts`

Provides push notification utilities using Expo Push API:

- **`sendNotificationToUser(userId, notification)`** - Send notification to a specific user
- **`sendNotificationToUsers(userIds, notification)`** - Send notification to multiple users
- **`sendPushNotifications(tokens, notification)`** - Send to specific push tokens
- **`getUserPushTokens(userId)`** - Get all push tokens for a user

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
  errorResponse,
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
  downloadImage,
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

### Sending Push Notifications

```typescript
import {
  sendNotificationToUser,
  sendNotificationToUsers,
} from "../_shared/notification.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  try {
    const { userId, title, body, data } = await req.json();

    // Send notification to a single user
    const result = await sendNotificationToUser(userId, {
      title,
      body,
      data,
      sound: "default",
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
});

// Send to multiple users
const results = await sendNotificationToUsers(["user-id-1", "user-id-2"], {
  title: "New Update",
  body: "Check out the latest features!",
  data: { screen: "home" },
});
```

## Environment Variables Required

Make sure these environment variables are set in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access

These are automatically available in Supabase Edge Functions.
