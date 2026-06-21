import { PAWBUCK_PUBLIC_ORIGIN } from "@/constants/healthExportUrls";
import { supabase } from "@/utils/supabase";
import type { User } from "@supabase/supabase-js";

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "If an account exists for that email, we sent a password reset link. Open it on this device to choose a new password.";

export const MIN_PASSWORD_LENGTH = 6;

/** Must match Supabase Authentication → URL configuration redirect allow-list. */
export const PASSWORD_RESET_REDIRECT_PATH = "/reset-password";

/** HTTPS redirect Supabase uses after the user taps the recovery email (opens app via universal link when configured). */
export function getPasswordResetRedirectUrl(): string {
  return `${PAWBUCK_PUBLIC_ORIGIN}${PASSWORD_RESET_REDIRECT_PATH}`;
}

export function userHasEmailPasswordIdentity(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.identities?.some((identity) => identity.provider === "email") ?? false;
}

/** Parse access/refresh tokens from Supabase auth redirect URLs (hash or query). */
export function parseAuthTokensFromUrl(url: string): {
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const paramString =
    hashIndex >= 0
      ? url.slice(hashIndex + 1)
      : queryIndex >= 0
        ? url.slice(queryIndex + 1)
        : "";

  const params = new URLSearchParams(paramString);
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    error: params.get("error"),
    errorDescription: params.get("error_description"),
  };
}

export async function createSessionFromAuthUrl(url: string): Promise<void> {
  const { accessToken, refreshToken, error, errorDescription } = parseAuthTokensFromUrl(url);

  if (error) {
    throw new Error(errorDescription ?? error);
  }

  if (!accessToken || !refreshToken) {
    throw new Error("This reset link is invalid or has expired.");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    throw sessionError;
  }
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Email is required.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    throw error;
  }

  return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }
}
