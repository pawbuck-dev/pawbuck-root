export function supabaseProjectHost(): string | null {
  try {
    const raw = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
    if (!raw) return null;
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

export function authErrorHint(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return [
      "Supabase Auth rejected this email/password. Try:",
      "• Authentication → Users: user exists; email matches exactly; account is confirmed (or turn off “Confirm email” under Providers → Email while testing).",
      "• If the user was invited or created without a password: use “Send recovery” / reset password, or set a password in the user details.",
      "• The Project line on this screen must match Supabase → Project Settings → API → Project URL (same *.supabase.co).",
      "• VITE_SUPABASE_URL / anon key in this build must be the same project as the consumer app.",
    ].join("\n");
  }
  if (m.includes("email not confirmed")) {
    return "Open the confirmation link from email, or in Supabase → Authentication → Users mark the user as confirmed.";
  }
  return null;
}
