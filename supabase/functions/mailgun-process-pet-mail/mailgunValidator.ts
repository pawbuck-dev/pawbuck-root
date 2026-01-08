import { encodeHex } from "jsr:@std/encoding/hex";

/**
 * Verify Mailgun webhook signature (v3)
 * Reference: https://documentation.mailgun.com/en/latest/api-webhooks.html#securing-webhooks
 */
export async function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string,
  signingKey: string
): Promise<boolean> {
  try {
    // Step 1: Check timestamp freshness (prevent replay attacks)
    // Mailgun recommends rejecting messages older than 15 minutes
    const messageTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTimestamp - messageTimestamp);

    if (timeDifference > 900) {
      // 15 minutes = 900 seconds
      console.error(`Timestamp too old: ${timeDifference} seconds`);
      return false;
    }

    // Step 2: Compute HMAC-SHA256
    const data = timestamp + token;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingKey);
    const messageData = encoder.encode(data);

    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the message
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);

    // Convert to hex string
    const computedSignature = encodeHex(new Uint8Array(signatureBuffer));

    // Step 3: Compare signatures (constant-time comparison)
    const isValid = computedSignature === signature.toLowerCase();

    if (!isValid) {
      console.error("Signature verification failed");
      console.error(`Expected: ${signature.toLowerCase()}`);
      console.error(`Computed: ${computedSignature}`);
    }

    return isValid;
  } catch (error) {
    console.error("Error verifying Mailgun signature:", error);
    return false;
  }
}

/**
 * Extract signature fields from FormData
 */
export interface SignatureFields {
  timestamp: string;
  token: string;
  signature: string;
}

/**
 * Extract signature verification fields from Mailgun webhook request
 */
export function extractSignatureFields(
  formData: FormData
): SignatureFields | null {
  const timestamp = formData.get("timestamp")?.toString();
  const token = formData.get("token")?.toString();
  const signature = formData.get("signature")?.toString();

  if (!timestamp || !token || !signature) {
    console.error("Missing signature fields in request");
    return null;
  }

  return { timestamp, token, signature };
}
