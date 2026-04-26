/**
 * Accept a pet family invite (RPC wrapper). Requires JWT; invite email must match auth email.
 * New users: keep `token` across sign-up (e.g. /accept-invite?token=… then call after session exists).
 *
 * POST JSON: { "token": "…" }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { errorResponse, handleCorsRequest, jsonResponse } from "../_shared/cors.ts";
import { createUserSupabaseClient } from "../_shared/supabase-utils.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.trim()) {
    return errorResponse("Unauthorized", 401);
  }

  const userClient = createUserSupabaseClient(authHeader);
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return errorResponse("Unauthorized", 401);
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const token = body.token?.trim();
  if (!token) {
    return errorResponse("Missing token", 400);
  }

  const { data, error } = await userClient.rpc("process_pet_family_invite_token", {
    p_token: token,
  });

  if (error) {
    console.error("[process-invite-token] rpc", error);
    return errorResponse(error.message ?? "Failed to process invite", 500);
  }

  const result = data as Record<string, unknown> | null;
  if (!result || result.ok !== true) {
    const err = typeof result?.error === "string" ? result.error : "rejected";
    const status =
      err === "unauthenticated"
        ? 401
        : err === "email_mismatch" || err === "already_owner"
          ? 403
          : err === "expired" || err === "invalid_token" || err === "not_pending"
            ? 400
            : err === "member_limit"
              ? 409
              : 400;
    return jsonResponse(result ?? { ok: false, error: err }, status);
  }

  return jsonResponse(result, 200);
});
