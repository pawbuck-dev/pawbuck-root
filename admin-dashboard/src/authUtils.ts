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
    return "Supabase rejected email/password. Check email confirmation, that the user has a password set, and that the project above matches Dashboard → API.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm the address from the inbox, or in Supabase Dashboard mark the user as confirmed.";
  }
  return null;
}
