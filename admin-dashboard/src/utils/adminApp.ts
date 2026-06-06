import { normalizePawbuckApiBase } from "@/api/supportClient";
import type { SupportUserDirectoryRow, SupportUserRow } from "@/types/support";

export function resolveAdminApiBase(): string {
  const raw = (import.meta.env.VITE_ADMIN_API_BASE ?? "").trim();
  if (!raw) return "http://localhost:5289";
  return normalizePawbuckApiBase(raw);
}

export function isBrowserMixedContentApi(adminPageHttps: boolean, apiBase: string): boolean {
  if (!adminPageHttps) return false;
  return apiBase.trim().toLowerCase().startsWith("http://");
}

export function formatDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return d.length === 10 ? d : "";
}

export function formatSubscriptionPlanLabel(plan: string, isFoundingMember = false): string {
  if (isFoundingMember) return "Founding (Individual)";
  if (plan === "individual") return "Individual";
  if (plan === "family") return "Family";
  return "Free";
}

export function mapDirectoryUser(u: SupportUserDirectoryRow): SupportUserRow {
  return { id: u.id, email: u.email, createdAt: u.createdAt };
}

export function placeholderUser(userId: string): SupportUserRow {
  return { id: userId, email: null, createdAt: null };
}
