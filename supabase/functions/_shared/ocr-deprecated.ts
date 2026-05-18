import { handleCorsRequest, jsonResponse } from "./cors.ts";
import { edgeOcrFunctionsEnabled } from "./email-health-ingestion/flags.ts";

/** Returns a 410 response when legacy Edge OCR is disabled (vault pipeline default). */
export function ocrDeprecatedResponse(req: Request): Response | null {
  if (edgeOcrFunctionsEnabled()) return null;
  if (req.method === "OPTIONS") return handleCorsRequest();
  return jsonResponse(
    {
      error: "ocr_deprecated",
      message:
        "Edge OCR functions are disabled. Health documents use PawBuck.API analyze-internal and pet_documents vault.",
    },
    410,
  );
}
