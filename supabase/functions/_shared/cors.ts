/**
 * Standard CORS headers for Supabase Edge Functions
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsRequest(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(
  error: string | Error,
  status: number = 500
): Response {
  const message = error instanceof Error ? error.message : error;
  return jsonResponse({ error: message }, status);
}









