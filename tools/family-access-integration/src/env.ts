import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Default keys for `supabase start` local stack. */
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
export const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.API_URL?.trim() ||
    LOCAL_SUPABASE_URL
  );
}

export function getAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.ANON_KEY?.trim() ||
    LOCAL_ANON_KEY
  );
}

export function getServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SERVICE_ROLE_KEY?.trim() ||
    LOCAL_SERVICE_ROLE_KEY
  );
}

export async function isLocalSupabaseReachable(): Promise<boolean> {
  const url = getSupabaseUrl();
  const anon = getAnonKey();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: anon },
    });
    return res.status === 200 || res.status === 404;
  } catch {
    return false;
  }
}

export function createServiceClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonClient(accessToken?: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
