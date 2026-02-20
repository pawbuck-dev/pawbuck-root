import type {
  EmailInfo,
  PetInfo,
  ProcessedAttachment,
  ProcessingResult,
  Pet,
} from "../types.ts";

/**
 * Build a response for blocked sender
 */
export function buildBlockedResponse(
  pet: PetInfo,
  email: EmailInfo,
  senderEmail: string
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      status: "blocked",
      message: `Email from ${senderEmail} is blocked for this pet`,
      pet,
      email,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Build a response for pending approval (unknown sender)
 */
export function buildPendingApprovalResponse(
  pet: PetInfo,
  email: EmailInfo,
  senderEmail: string,
  pendingApprovalId: string
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      status: "pending_approval",
      message: `Email from unknown sender ${senderEmail} requires user approval`,
      pendingApprovalId,
      pet,
      email,
    }),
    {
      status: 202, // Accepted - processing deferred
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Build a success response with processed attachments
 */
export function buildSuccessResponse(
  pet: Pet,
  email: EmailInfo,
  processedAttachments: ProcessedAttachment[],
  message?: string
): Response {
  const result: ProcessingResult = {
    success: true,
    pet,
    email,
    processedAttachments,
  };

  const responseBody = message ? { ...result, message } : result;

  return new Response(JSON.stringify(responseBody), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Build an error response
 */
export function buildErrorResponse(
  error: string,
  statusCode: number = 500
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Build a validation error response (400)
 */
export function buildValidationErrorResponse(error: string): Response {
  return buildErrorResponse(error, 400);
}

/**
 * Build a not found response (404)
 */
export function buildNotFoundResponse(error: string): Response {
  return buildErrorResponse(error, 404);
}

/**
 * Log processing summary
 */
export function logProcessingSummary(
  processedAttachments: ProcessedAttachment[]
): void {
  console.log("\n=== Processing Complete ===");
  console.log(`Total attachments: ${processedAttachments.length}`);
  console.log(
    `Uploaded: ${processedAttachments.filter((a) => a.uploaded).length}`
  );
  console.log(
    `OCR success: ${processedAttachments.filter((a) => a.ocrSuccess).length}`
  );
  console.log(
    `DB inserted: ${processedAttachments.filter((a) => a.dbInserted).length}`
  );
}

