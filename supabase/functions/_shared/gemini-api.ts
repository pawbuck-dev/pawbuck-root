/**
 * Shared Gemini API utility with dynamic model fallback
 * 
 * Automatically falls back from preferred cutting-edge model to LTS model
 * when the preferred model is unavailable (404 errors).
 */

// Model priority: preferred → fallback
const PREFERRED_MODEL = "gemini-2.0-flash-exp";
const FALLBACK_MODEL = "gemini-1.5-flash";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiAPIResponse {
  response: Response;
  data: any;
  modelUsed: string;
  fallbackOccurred: boolean;
}

/**
 * Call Gemini API with automatic fallback on 404 errors
 * 
 * @param requestBody - The JSON request body to send to Gemini API
 * @param context - Optional context string for logging (e.g., function name)
 * @returns Promise with response data and metadata about which model was used
 * @throws Error if both models fail or if a non-404 error occurs
 */
export async function callGeminiAPI(
  requestBody: Record<string, any>,
  context?: string
): Promise<GeminiAPIResponse> {
  const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const logContext = context ? `[${context}]` : "[Gemini API]";
  
  // Try preferred model first
  const preferredUrl = `${GEMINI_API_BASE_URL}/${PREFERRED_MODEL}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(preferredUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    // Check status before trying to parse response
    const status = response.status;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`${logContext} Successfully used preferred model: ${PREFERRED_MODEL}`);
      return {
        response,
        data,
        modelUsed: PREFERRED_MODEL,
        fallbackOccurred: false,
      };
    }

    // If 404, try fallback model
    if (status === 404) {
      console.warn(
        `${logContext} Preferred model ${PREFERRED_MODEL} returned 404, falling back to ${FALLBACK_MODEL}`
      );
      
      const fallbackUrl = `${GEMINI_API_BASE_URL}/${FALLBACK_MODEL}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        console.log(`${logContext} Successfully used fallback model: ${FALLBACK_MODEL}`);
        return {
          response: fallbackResponse,
          data,
          modelUsed: FALLBACK_MODEL,
          fallbackOccurred: true,
        };
      }

      // Both models failed
      const errorText = await fallbackResponse.text().catch(() => "Unable to read error response");
      console.error(
        `${logContext} Both models failed. Fallback model error (${fallbackResponse.status}):`,
        errorText
      );
      throw new Error(
        `API Error: Both ${PREFERRED_MODEL} (404) and ${FALLBACK_MODEL} (${fallbackResponse.status}) failed. ${errorText.substring(0, 200)}`
      );
    }

    // Non-404 error from preferred model - don't fallback, propagate immediately
    const errorText = await response.text().catch(() => "Unable to read error response");
    console.error(
      `${logContext} Preferred model error (${status}):`,
      errorText
    );
    throw new Error(
      `API Error: ${status} - ${errorText.substring(0, 200)}`
    );
  } catch (error) {
    // Re-throw if it's already an Error we created (has "API Error" prefix)
    if (error instanceof Error && error.message.startsWith("API Error")) {
      throw error;
    }
    // Wrap unexpected errors (network errors, etc.)
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${logContext} Unexpected error:`, errorMessage);
    throw new Error(`API Error: ${errorMessage}`);
  }
}

/**
 * Get the current preferred model name
 */
export function getPreferredModel(): string {
  return PREFERRED_MODEL;
}

/**
 * Get the current fallback model name
 */
export function getFallbackModel(): string {
  return FALLBACK_MODEL;
}
