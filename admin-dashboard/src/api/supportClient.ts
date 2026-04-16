import type {
  CreateSupportVaccinationBody,
  SupportHealthTimelineEvent,
  SupportMetrics,
  SupportPetExplorerRow,
  SupportPetRow,
  SupportUserDirectoryResponse,
  SupportUserRow,
  SupportVaccinationRow,
  UpdateSupportVaccinationBody,
} from "@/types/support";

export class SupportApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "SupportApiError";
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error && typeof data.error === "string") return data.error;
  } catch {
    // ignore
  }
  return res.statusText || `HTTP ${res.status}`;
}

/**
 * PawBuck.API base must be the origin only (e.g. https://api.pawbuck.com).
 * Strips accidental paths such as /api/support/metrics from env typos or pasted URLs.
 */
export function normalizePawbuckApiBase(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const href = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    return new URL(href).origin;
  } catch {
    return t.replace(/\/$/, "");
  }
}

/** Pass the Supabase session access token (or empty when using Development anonymous support). */
export function createSupportClient(
  baseUrl: string,
  getAccessToken: () => string | null | undefined,
) {
  const root = normalizePawbuckApiBase(baseUrl);

  async function request<T>(
    path: string,
    init?: RequestInit & { json?: unknown },
  ): Promise<T> {
    const token = getAccessToken();
    const { json, headers: initHeaders, body: initBody, ...rest } = init ?? {};
    const headers: HeadersInit = {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(initHeaders ?? {}),
    };
    const res = await fetch(`${root}${path}`, {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : initBody,
    });
    if (!res.ok) {
      throw new SupportApiError(await parseErrorMessage(res), res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    getMetrics: () => request<SupportMetrics>("/api/support/metrics"),

    /** Same cohorts as the metric cards: all auth users, users with a pet, users with pet + health data. */
    listUsers: (segment: "all" | "withPets" | "withHealth") =>
      request<SupportUserRow[]>(
        `/api/support/users/list?segment=${encodeURIComponent(segment)}`,
      ),

    searchUsers: (q: string) =>
      request<SupportUserRow[]>(`/api/support/users/search?q=${encodeURIComponent(q)}`),

    getUserDirectory: (q: string, page: number, pageSize: number) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (q.trim()) params.set("q", q.trim());
      return request<SupportUserDirectoryResponse>(`/api/support/users/directory?${params.toString()}`);
    },

    searchPets: (q: string) =>
      request<SupportPetExplorerRow[]>(
        `/api/support/pets/search?q=${encodeURIComponent(q)}`,
      ),

    getUserTimeline: (userId: string) =>
      request<SupportHealthTimelineEvent[]>(
        `/api/support/users/${userId}/timeline`,
      ),

    getPetsForUser: (userId: string) =>
      request<SupportPetRow[]>(`/api/support/users/${userId}/pets`),

    listVaccinations: (petId: string) =>
      request<SupportVaccinationRow[]>(`/api/support/pets/${petId}/vaccinations`),

    createVaccination: (petId: string, body: CreateSupportVaccinationBody) =>
      request<SupportVaccinationRow>(`/api/support/pets/${petId}/vaccinations`, {
        method: "POST",
        json: body,
      }),

    updateVaccination: (vaccinationId: string, body: UpdateSupportVaccinationBody) =>
      request<SupportVaccinationRow>(`/api/support/vaccinations/${vaccinationId}`, {
        method: "PUT",
        json: body,
      }),
  };
}
