import type {
  CreateSupportVaccinationBody,
  SupportMetrics,
  SupportPetRow,
  SupportUserRow,
  SupportVaccinationRow,
  UpdateSupportVaccinationBody,
} from "@/types/support";

const API_KEY_HEADER = "X-Admin-Api-Key";

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

export function createSupportClient(baseUrl: string, getApiKey: () => string) {
  const root = baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    init?: RequestInit & { json?: unknown },
  ): Promise<T> {
    const key = getApiKey();
    const { json, headers: initHeaders, body: initBody, ...rest } = init ?? {};
    const headers: HeadersInit = {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(key ? { [API_KEY_HEADER]: key } : {}),
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

    searchUsers: (q: string) =>
      request<SupportUserRow[]>(`/api/support/users/search?q=${encodeURIComponent(q)}`),

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
