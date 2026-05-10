import type { AppleAuthenticationFullName } from "expo-apple-authentication";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { upsertUserPreferences } from "@/services/userPreferences";
import { supabase } from "@/utils/supabase";

/**
 * Format Apple `fullName` (only present on first successful Sign in with Apple).
 */
export function formatAppleFullName(
  fullName: AppleAuthenticationFullName | null | undefined
): string {
  if (!fullName) return "";
  const parts = [
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
  ]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim());
  return parts.join(" ").trim();
}

type GoogleSignInUserBlock = {
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
};

/**
 * Display name from Google Sign-In user payload (`userInfo.data.user`).
 */
export function extractGoogleDisplayName(
  googleUser: GoogleSignInUserBlock | null | undefined
): string {
  if (!googleUser) return "";
  const direct = typeof googleUser.name === "string" ? googleUser.name.trim() : "";
  if (direct) return direct;
  const g = googleUser.givenName?.trim() ?? "";
  const f = googleUser.familyName?.trim() ?? "";
  return [g, f].filter(Boolean).join(" ").trim();
}

type UserMetadataNameFields = {
  full_name?: string;
  name?: string;
};

/**
 * Raw display string from Supabase JWT `user_metadata` (OAuth may set `full_name` and/or `name`).
 */
export function resolveAuthDisplayName(user: SupabaseUser | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata as UserMetadataNameFields | undefined;
  const full = typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  if (full) return full;
  const name = typeof meta?.name === "string" ? meta.name.trim() : "";
  return name;
}

/**
 * Reject opaque provider handles (e.g. relay local parts) for greetings; keep real names.
 */
export function isPlausibleDisplayNameForGreeting(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (s.length > 80) return false;
  if (/[^\x00-\x7F]/.test(s)) return true;
  if (/\s/.test(s)) return true;
  if (/^[a-zA-Z][a-zA-Z\s.'-]*$/u.test(s)) return true;
  if (/^[a-zA-Z0-9]+$/.test(s) && /\d/.test(s) && /[a-zA-Z]/i.test(s) && s.length >= 8) {
    return false;
  }
  return /^[a-zA-Z]{2,}$/u.test(s);
}

/** True when we should offer the optional “What should we call you?” step (no usable display name). */
export function needsDisplayNamePrompt(user: SupabaseUser | null | undefined): boolean {
  if (!user) return false;
  const resolved = resolveAuthDisplayName(user);
  return !isPlausibleDisplayNameForGreeting(resolved);
}

/**
 * Persist owner display name to Supabase auth `user_metadata.full_name` and `user_preferences.full_name`.
 */
export async function persistOwnerDisplayNameForSession(displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) return;

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    console.warn("[authDisplayName] persistOwnerDisplayName: no session user", userErr);
    return;
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  });
  if (updateErr) {
    console.warn("[authDisplayName] updateUser full_name", updateErr);
    return;
  }

  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    console.warn("[authDisplayName] refreshSession after full_name", refreshErr);
  }

  try {
    await upsertUserPreferences(user.id, { full_name: trimmed });
  } catch (e) {
    console.warn("[authDisplayName] upsertUserPreferences full_name", e);
  }
}
