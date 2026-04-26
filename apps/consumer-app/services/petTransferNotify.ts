import { supabase } from "@/utils/supabase";

function functionsBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("EXPO_PUBLIC_SUPABASE_URL is not configured");
  return `${url.replace(/\/$/, "")}/functions/v1`;
}

function anonKey(): string {
  const k = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim();
  if (!k) throw new Error("EXPO_PUBLIC_SUPABASE_KEY is not configured");
  return k;
}

async function postNotify(body: Record<string, string>): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const url = `${functionsBaseUrl()}/pet-transfer-notify`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.warn("[petTransferNotify]", res.status, t);
  }
}

export async function notifyPetTransferCreated(transferId: string): Promise<void> {
  await postNotify({ event: "created", transferId });
}

export async function notifyPetTransferAccepted(transferCode: string): Promise<void> {
  await postNotify({ event: "accepted", transferCode: transferCode.trim().toUpperCase() });
}

export async function notifyPetTransferDeclined(transferCode: string): Promise<void> {
  await postNotify({ event: "declined", transferCode: transferCode.trim().toUpperCase() });
}
