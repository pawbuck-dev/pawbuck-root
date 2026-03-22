import { Database } from "@/database.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. Add them to apps/consumer-app/.env.local (see .env.example), then restart Metro with: npx expo start --clear"
  );
}

const looksLikePlaceholder =
  supabaseUrl.includes("your-project") ||
  supabaseUrl.includes("placeholder") ||
  supabaseAnonKey === "your-anon-key";

if (__DEV__ && looksLikePlaceholder) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] .env.local still has placeholder URL/key — sign-in and API calls will fail with \"Network request failed\". Use your real Project URL and anon key from Supabase → Project Settings → API, then restart Metro (--clear)."
  );
}

if (__DEV__) {
  try {
    const u = new URL(supabaseUrl);
    // eslint-disable-next-line no-console
    console.log(
      `[Supabase] EXPO_PUBLIC_SUPABASE_URL → ${u.protocol}//${u.host} (check this matches Dashboard or local Supabase; restart Metro after .env.local changes)`
    );
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      "[Supabase] EXPO_PUBLIC_SUPABASE_URL is not a valid URL — fix .env.local and run: npx expo start --clear"
    );
  }
  if (/127\.0\.0\.1|localhost/i.test(supabaseUrl)) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Supabase] URL uses localhost/127.0.0.1 — the iOS Simulator usually cannot reach Supabase on your Mac. Use your Mac’s LAN IP, e.g. http://192.168.1.x:54321 (from `supabase status`), not 127.0.0.1."
    );
  }
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
);
