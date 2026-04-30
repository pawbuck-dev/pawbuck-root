/**
 * Classify Supabase / PostgREST errors for consistent session vs RLS UX.
 * See __tests__/utils/supabaseAuthErrors.test.ts for examples.
 */

function messageOf(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return String((err as { message: string }).message);
  }
  return err instanceof Error ? err.message : String(err ?? "");
}

function codeOf(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code: unknown }).code;
    if (typeof c === "string") return c;
  }
  return undefined;
}

/** JWT / refresh failures and PostgREST auth failures — treat as re-login. */
export function isSessionExpiredLikeError(err: unknown): boolean {
  const msg = messageOf(err).toLowerCase();
  const code = codeOf(err);

  if (typeof (err as { status?: unknown })?.status === "number" && (err as { status: number }).status === 401) {
    return true;
  }

  if (
    msg.includes("jwt") ||
    msg.includes("invalid refresh token") ||
    msg.includes("refresh token not found") ||
    msg.includes("session expired") ||
    msg.includes("session missing") ||
    msg.includes("not authenticated") ||
    msg.includes("auth session missing")
  ) {
    return true;
  }

  // PostgREST: invalid / expired JWT on API requests (code varies by version)
  if (code === "PGRST301") return true;

  return false;
}

/** RLS / permission denied — user is signed in but must not see this row or action. */
export function isRlsAccessDeniedError(err: unknown): boolean {
  const msg = messageOf(err).toLowerCase();
  const code = codeOf(err);

  if (code === "42501") return true;
  if (code === "PGRST204" || code === "PGRST116") return false;

  if (msg.includes("permission denied") || msg.includes("row-level security") || msg.includes("rls")) return true;

  if (typeof (err as { status?: unknown })?.status === "number" && (err as { status: number }).status === 403) {
    return true;
  }

  return false;
}
