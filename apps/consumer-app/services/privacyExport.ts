import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

export type PrivacyExportStatus = {
  status: "none" | "queued" | "running" | "ready" | "failed" | "expired";
  requestId?: string;
  expiresAt?: string;
  createdAt?: string;
  hasFile?: boolean;
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return { Authorization: `Bearer ${token}` };
}

export async function requestPrivacyExport(): Promise<{ requestId: string }> {
  const base = getPawbuckApiBaseUrl();
  if (!base) throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");

  const res = await fetch(`${base}/api/privacy/export`, {
    method: "POST",
    headers: await authHeaders(),
  });

  if (res.status === 409) {
    throw new Error("An export is already in progress.");
  }
  if (!res.ok) {
    throw new Error(await res.text() || `export request HTTP ${res.status}`);
  }

  const json = (await res.json()) as { requestId?: string };
  if (!json.requestId) throw new Error("Invalid export response");
  return { requestId: json.requestId };
}

export async function fetchPrivacyExportStatus(): Promise<PrivacyExportStatus> {
  const base = getPawbuckApiBaseUrl();
  if (!base) throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");

  const res = await fetch(`${base}/api/privacy/export/status`, {
    headers: await authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await res.text() || `export status HTTP ${res.status}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  return {
    status: (json.status as PrivacyExportStatus["status"]) ?? "none",
    requestId: json.requestId ? String(json.requestId) : undefined,
    expiresAt: json.expiresAt ? String(json.expiresAt) : undefined,
    createdAt: json.createdAt ? String(json.createdAt) : undefined,
    hasFile: Boolean(json.hasFile),
  };
}
