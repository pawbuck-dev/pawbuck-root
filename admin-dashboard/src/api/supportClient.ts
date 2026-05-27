import type {
  CreateSupportVaccinationBody,
  MiloClassifyExtractPreviewResponse,
  MiloClassifyPreviewBody,
  MiloClassifyResponse,
  MiloChatApiResponse,
  MiloJournalChatSmokeBody,
  MiloJournalConfigSnapshot,
  MedicationAdrStats,
  MedicationAdrOverrideRow,
  CreateMedicationAdrOverrideBody,
  MiloJournalFeedbackAggregates,
  CountryEmailDocumentVerificationListResponse,
  CountryEmailDocumentVerificationRow,
  PatchCountryEmailDocumentVerificationBody,
  PatchSubscriptionFeatureGateBody,
  SubscriptionFeatureGateRow,
  SubscriptionFeatureGatesResponse,
  SupportDocumentProcessingMetricsResponse,
  SupportDocumentSyncRunResponse,
  SupportHealthTimelineEvent,
  SupportMetrics,
  SupportPetExplorerRow,
  SupportPetRow,
  SupportProcessedEmailAttachmentsResponse,
  SupportProcessedEmailDetail,
  SupportProcessedEmailSignedUrlResponse,
  SupportProcessedEmailsListResponse,
  SupportProcessedEmailsSummaryResponse,
  SupportBulkClearReviewInboxRequest,
  SupportBulkClearReviewInboxResponse,
  SupportBulkReprocessReviewInboxRequest,
  SupportBulkReprocessReviewInboxResponse,
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

    /**
     * One-shot: sync pending pet_documents vault rows into clinical tables (same as background DocumentSyncWorker).
     * batchSize is clamped server-side to 1–100.
     */
    runPendingDocumentSync: (batchSize?: number) => {
      const p = new URLSearchParams();
      if (batchSize != null) p.set("batchSize", String(batchSize));
      const qs = p.toString();
      return request<SupportDocumentSyncRunResponse>(
        `/api/support/document-sync/run${qs ? `?${qs}` : ""}`,
        { method: "POST" },
      );
    },

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

    listSubscriptionFeatureGates: () =>
      request<SubscriptionFeatureGatesResponse>("/api/support/subscription/feature-gates"),

    patchSubscriptionFeatureGate: (featureKey: string, body: PatchSubscriptionFeatureGateBody) =>
      request<SubscriptionFeatureGateRow>(
        `/api/support/subscription/feature-gates/${encodeURIComponent(featureKey)}`,
        {
          method: "PATCH",
          json: body,
        },
      ),

    listEmailDocumentVerificationRules: () =>
      request<CountryEmailDocumentVerificationListResponse>(
        "/api/support/email-document-verification",
      ),

    patchEmailDocumentVerificationRule: (
      country: string,
      body: PatchCountryEmailDocumentVerificationBody,
    ) =>
      request<CountryEmailDocumentVerificationRow>(
        `/api/support/email-document-verification/${encodeURIComponent(country)}`,
        { method: "PATCH", json: body },
      ),

    /** In-memory Milo document classification only (admin/support only; no storage). */
    classifyMiloPreview: (body: MiloClassifyPreviewBody) =>
      request<MiloClassifyResponse>("/api/support/milo/classify-preview", {
        method: "POST",
        json: body,
      }),

    /**
     * Classification + flexible vault JSON extraction (title, summary, keyFacts, …) — same pipeline as consumer Milo vision; no DB/storage.
     */
    classifyMiloExtractPreview: (body: MiloClassifyPreviewBody) =>
      request<MiloClassifyExtractPreviewResponse>("/api/support/milo/classify-extract-preview", {
        method: "POST",
        json: body,
      }),

    getMiloJournalConfig: () => request<MiloJournalConfigSnapshot>("/api/support/milo/journal/config"),

    patchMiloJournalConfig: (config: MiloJournalConfigSnapshot) =>
      request<MiloJournalConfigSnapshot>("/api/support/milo/journal/config", {
        method: "PATCH",
        json: { config },
      }),

    getMiloJournalFeedbackAggregates: () =>
      request<MiloJournalFeedbackAggregates>("/api/support/milo/journal/feedback-aggregates"),

    getMedicationAdrStats: () =>
      request<MedicationAdrStats>("/api/support/medication-adr/stats"),

    runMedicationAdrIngest: (sourceVersion?: string) => {
      const p = sourceVersion ? `?sourceVersion=${encodeURIComponent(sourceVersion)}` : "";
      return request<{ status: string; productsUpserted: number; entriesUpserted: number }>(
        `/api/support/medication-adr/ingest${p}`,
        { method: "POST" },
      );
    },

    listMedicationAdrOverrides: () =>
      request<MedicationAdrOverrideRow[]>("/api/support/medication-adr/overrides"),

    createMedicationAdrOverride: (body: CreateMedicationAdrOverrideBody) =>
      request<MedicationAdrOverrideRow>("/api/support/medication-adr/overrides", {
        method: "POST",
        json: body,
      }),

    deactivateMedicationAdrOverride: (id: string) =>
      request<{ ok: boolean }>(`/api/support/medication-adr/overrides/${id}/deactivate`, {
        method: "POST",
      }),

    /** Same Milo chat pipeline as the consumer app for a verified user/pet (AdminSupport only; no subscription gate). */
    postMiloJournalChatSmoke: (body: MiloJournalChatSmokeBody) =>
      request<MiloChatApiResponse>("/api/support/milo/journal/chat-smoke", {
        method: "POST",
        json: body,
      }),

    listProcessedEmails: (params: {
      page?: number;
      pageSize?: number;
      from?: string;
      to?: string;
      documentType?: string;
      reviewStatus?: string;
      q?: string;
      failuresOnly?: boolean;
      reviewInboxOnly?: boolean;
      ownerEmail?: string;
    }) => {
      const p = new URLSearchParams();
      if (params.page != null) p.set("page", String(params.page));
      if (params.pageSize != null) p.set("pageSize", String(params.pageSize));
      if (params.from) p.set("from", params.from);
      if (params.to) p.set("to", params.to);
      if (params.documentType != null && params.documentType !== "")
        p.set("documentType", params.documentType);
      if (params.reviewStatus != null && params.reviewStatus !== "")
        p.set("reviewStatus", params.reviewStatus);
      if (params.q != null && params.q.trim()) p.set("q", params.q.trim());
      if (params.failuresOnly === false) p.set("failuresOnly", "false");
      if (params.reviewInboxOnly) p.set("reviewInboxOnly", "true");
      if (params.ownerEmail?.trim()) p.set("ownerEmail", params.ownerEmail.trim());
      const qs = p.toString();
      return request<SupportProcessedEmailsListResponse>(
        `/api/support/processed-emails${qs ? `?${qs}` : ""}`,
      );
    },

    getProcessedEmail: (id: string) =>
      request<SupportProcessedEmailDetail>(`/api/support/processed-emails/${encodeURIComponent(id)}`),

    getProcessedEmailsSummary: (from?: string, to?: string) => {
      const p = new URLSearchParams();
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const qs = p.toString();
      return request<SupportProcessedEmailsSummaryResponse>(
        `/api/support/processed-emails/summary${qs ? `?${qs}` : ""}`,
      );
    },

    getDocumentProcessingMetrics: (from?: string, to?: string) => {
      const p = new URLSearchParams();
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const qs = p.toString();
      return request<SupportDocumentProcessingMetricsResponse>(
        `/api/support/document-processing/metrics${qs ? `?${qs}` : ""}`,
      );
    },

    listProcessedEmailAttachments: (id: string) =>
      request<SupportProcessedEmailAttachmentsResponse>(
        `/api/support/processed-emails/${encodeURIComponent(id)}/attachments`,
      ),

    getProcessedEmailAttachmentSignedUrl: (id: string, index: number, ttlSeconds?: number) => {
      const p = new URLSearchParams();
      if (ttlSeconds != null) p.set("ttlSeconds", String(ttlSeconds));
      const qs = p.toString();
      return request<SupportProcessedEmailSignedUrlResponse>(
        `/api/support/processed-emails/${encodeURIComponent(id)}/attachments/${index}/signed-url${qs ? `?${qs}` : ""}`,
      );
    },

    bulkClearReviewInbox: (body: SupportBulkClearReviewInboxRequest) =>
      request<SupportBulkClearReviewInboxResponse>("/api/support/processed-emails/bulk-clear-review-inbox", {
        method: "POST",
        json: body,
      }),

    bulkReprocessReviewInbox: (body: SupportBulkReprocessReviewInboxRequest) =>
      request<SupportBulkReprocessReviewInboxResponse>(
        "/api/support/processed-emails/bulk-reprocess-review-inbox",
        { method: "POST", json: body },
      ),
  };
}
