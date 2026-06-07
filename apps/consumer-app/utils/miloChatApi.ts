import { Pet } from "@/context/petsContext";
import type {
  JournalContextSurface,
  JournalCurrentQuestion,
  JournalInterviewPhase,
  JournalStructuredSummary,
} from "@/types/journalInterview";
import type { VetMedicalContext, VetNotificationPayload } from "@/types/vetNotification";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

/** Set `EXPO_PUBLIC_MILO_DEBUG=true` in .env.local to log Milo requests in non-dev builds. */
function miloDebug(...args: unknown[]) {
  if (__DEV__ || process.env.EXPO_PUBLIC_MILO_DEBUG === "true") {
    console.log("[Milo API]", ...args);
  }
}

/** API returned 402 Payment Required — upgrade required. */
export class SubscriptionRequiredError extends Error {
  readonly code: string;
  readonly upgradePlan: "individual" | "family";

  constructor(message: string, code = "subscription_required", upgradePlan: "individual" | "family" = "individual") {
    super(message);
    this.name = "SubscriptionRequiredError";
    this.code = code;
    this.upgradePlan = upgradePlan;
  }
}

export type MiloChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

/** Health document linked to a Milo reply (Supabase `pets` bucket path). */
export type MiloChatFileAttachment = {
  id: string;
  kind: string;
  title: string;
  storagePath: string;
};

export type MiloChatApiResult = {
  answer: string;
  suggestedReplies?: string[];
  journalSessionComplete?: boolean;
  journalStatus?: string;
  journalSummary?: string;
  /** Phase 4 red-flag: do not persist journal entry. */
  journalEmergencyStop?: boolean;
  /** Structured vet-notification payload when journal completes (API). */
  vetNotification?: VetNotificationPayload | null;
  /** Record-backed medical lines for vet compose (API). */
  vetMedicalContext?: VetMedicalContext | null;
  /** Server turn id for POST /api/milo/chat/feedback (general + journal). */
  turnId?: string;
  /** @deprecated Same as turnId when present */
  responseId?: string;
  promptVersion?: string;
  heuristicTags?: string[];
  fileAttachments?: MiloChatFileAttachment[];
  usedPetData?: boolean;
  usedRag?: boolean;
  interviewPhase?: JournalInterviewPhase;
  treeId?: string;
  treeVersion?: string;
  journalSessionId?: string;
  questionsAskedCount?: number;
  contextSurface?: JournalContextSurface;
  structuredSummary?: JournalStructuredSummary;
  emergencyDetected?: boolean;
  confidenceScore?: number;
  currentQuestion?: JournalCurrentQuestion;
  /** Opens Health Records upload from context_surface (vaccination | medication). */
  journalHealthDeepLink?: "vaccination" | "medication";
};

export type JournalActiveSession = {
  sessionId: string;
  treeId: string;
  treeVersion: string;
  phase: string;
  questionsAskedCount: number;
};

function parseVetMedicalContext(raw: unknown): VetMedicalContext | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : undefined);
  const out: VetMedicalContext = {
    lastVisitDate: s("lastVisitDate"),
    lastVisitLabel: s("lastVisitLabel"),
    vaccinesStatus: s("vaccinesStatus"),
    vaccinesDetail: s("vaccinesDetail"),
    medicationsLine: s("medicationsLine"),
    allergiesLine: s("allergiesLine"),
    insuranceLine: s("insuranceLine"),
    weightTrendSummary: s("weightTrendSummary"),
  };
  const has =
    out.lastVisitDate ||
    out.lastVisitLabel ||
    out.vaccinesStatus ||
    out.vaccinesDetail ||
    out.medicationsLine ||
    out.allergiesLine ||
    out.insuranceLine ||
    out.weightTrendSummary;
  return has ? out : undefined;
}

function parseVetNotificationPayload(raw: unknown): VetNotificationPayload | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  return raw as VetNotificationPayload;
}

function parseTurnIdFromChatJson(data: {
  turnId?: unknown;
  responseId?: unknown;
}): string | undefined {
  if (typeof data.turnId === "string" && data.turnId.trim()) {
    return data.turnId.trim();
  }
  if (data.responseId != null && String(data.responseId).trim()) {
    return String(data.responseId).trim();
  }
  return undefined;
}

/** Pet fields sent to POST /api/milo/chat (matches chatContext PetContext). */
export function petToMiloApiContext(pet: Pet) {
  const rawWeight = pet.weight_value;
  const weightValue =
    typeof rawWeight === "number" && Number.isFinite(rawWeight) ? rawWeight : null;

  return {
    id: pet.id,
    name: pet.name,
    animal_type: pet.animal_type,
    breed: pet.breed,
    date_of_birth: pet.date_of_birth,
    sex: pet.sex,
    ...(weightValue != null ? { weight_value: weightValue, weight_unit: pet.weight_unit } : {}),
  };
}

/**
 * Calls PawBuck.API Milo chat. Set `journalMode` for structured journal interview
 * (suggested quick replies + completion flag from the API).
 */
export async function fetchMiloChat(params: {
  message: string;
  pet: Pet | null;
  /** Prior turns only; do not include the current user message. */
  history: MiloChatHistoryItem[];
  journalMode?: boolean;
  journalTreeId?: string;
  journalSessionId?: string;
  journalChipIds?: string[];
  journalAction?: string;
  journalSummaryFields?: Record<string, string>;
}): Promise<MiloChatApiResult> {
  const {
    message,
    pet,
    history,
    journalMode,
    journalTreeId,
    journalSessionId,
    journalChipIds,
    journalAction,
    journalSummaryFields,
  } = params;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to chat with Milo.");
  }

  const baseUrl = getPawbuckApiBaseUrl();
  if (!baseUrl) {
    throw new Error("PawBuck API URL is not configured (EXPO_PUBLIC_PAWBUCK_API_URL).");
  }

  const chatUrl = `${baseUrl}/api/milo/chat`;
  const payload = {
    message: message.trim(),
    pet: pet ? petToMiloApiContext(pet) : null,
    history,
    journalMode: journalMode ?? false,
    journalTreeId: journalTreeId ?? undefined,
    journalSessionId: journalSessionId ?? undefined,
    journalChipIds: journalChipIds ?? undefined,
    journalAction: journalAction ?? undefined,
    journalSummaryFields: journalSummaryFields ?? undefined,
  };

  miloDebug("POST", chatUrl, {
    journalMode: payload.journalMode,
    petId: payload.pet?.id ?? null,
    historyTurns: history.length,
  });

  const res = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  miloDebug("response", { status: res.status, ok: res.ok, statusText: res.statusText });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Your session expired or is not authorized. Please sign in again to use Milo.");
  }

  if (res.status === 402) {
    let msg = "Upgrade to Individual to continue with Milo.";
    let code = "subscription_required";
    let upgradePlan: "individual" | "family" = "individual";
    try {
      const j = (await res.json()) as { message?: string; code?: string; upgrade_plan?: string };
      if (j?.message) msg = j.message;
      if (j?.code) code = j.code;
      if (j?.upgrade_plan === "family") upgradePlan = "family";
    } catch {
      /* ignore */
    }
    throw new SubscriptionRequiredError(msg, code, upgradePlan);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    miloDebug("error body (non-OK)", t?.slice(0, 500) || "(empty)");
    throw new Error(t || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as {
    answer?: string;
    suggestedReplies?: string[];
    journalSessionComplete?: boolean;
    journalStatus?: string;
    journalSummary?: string;
    journalEmergencyStop?: boolean;
    vetNotification?: unknown;
    vetMedicalContext?: unknown;
    turnId?: string;
    responseId?: string;
    promptVersion?: string;
    heuristicTags?: string[];
    usedPetData?: boolean;
    usedRag?: boolean;
    fileAttachments?: unknown;
    interviewPhase?: JournalInterviewPhase;
    treeId?: string;
    treeVersion?: string;
    journalSessionId?: string;
    questionsAskedCount?: number;
    contextSurface?: JournalContextSurface;
    structuredSummary?: JournalStructuredSummary;
    emergencyDetected?: boolean;
    confidenceScore?: number;
    currentQuestion?: JournalCurrentQuestion;
    journalHealthDeepLink?: string;
  };
  if (!data?.answer) {
    miloDebug("error: JSON had no answer field", data);
    throw new Error("No response received");
  }

  const rawAttachments = data.fileAttachments;
  const fileAttachments: MiloChatFileAttachment[] | undefined = Array.isArray(rawAttachments)
    ? rawAttachments
        .map((row) => {
          const r = row as Record<string, unknown>;
          const id = typeof r.id === "string" ? r.id : "";
          const kind = typeof r.kind === "string" ? r.kind : "";
          const title = typeof r.title === "string" ? r.title : "Document";
          const storagePath = typeof r.storagePath === "string" ? r.storagePath : "";
          if (!id || !storagePath.trim()) return null;
          return { id, kind, title, storagePath: storagePath.trim() };
        })
        .filter((x): x is MiloChatFileAttachment => x != null)
    : undefined;

  const looksLikeServerTrouble =
    data.answer.includes("Sorry, I'm having trouble") ||
    data.answer.includes("not quite configured") ||
    data.answer.includes("Woof! Something went wrong");

  const turnId = parseTurnIdFromChatJson(data);

  if (looksLikeServerTrouble) {
    miloDebug("warning: API returned 200 but answer looks like a failure path — check PawBuck.API logs / Gemini / DB", {
      answerPreview: data.answer.slice(0, 160),
      journalMode: journalMode ?? false,
      usedPetData: data.usedPetData,
      turnId,
      promptVersion: data.promptVersion,
    });
  } else {
    miloDebug("ok", {
      answerLength: data.answer.length,
      usedPetData: data.usedPetData,
      turnId,
      promptVersion: data.promptVersion,
      heuristicTags: data.heuristicTags,
    });
  }

  return {
    answer: data.answer,
    suggestedReplies: data.suggestedReplies,
    journalSessionComplete: data.journalSessionComplete,
    journalStatus: data.journalStatus,
    journalSummary: data.journalSummary,
    journalEmergencyStop: Boolean(data.journalEmergencyStop),
    vetNotification: parseVetNotificationPayload(data.vetNotification),
    vetMedicalContext: parseVetMedicalContext(data.vetMedicalContext),
    turnId,
    responseId: turnId,
    promptVersion: data.promptVersion,
    heuristicTags: data.heuristicTags,
    fileAttachments: fileAttachments && fileAttachments.length > 0 ? fileAttachments : undefined,
    usedPetData: data.usedPetData,
    usedRag: data.usedRag,
    interviewPhase: data.interviewPhase,
    treeId: data.treeId,
    treeVersion: data.treeVersion,
    journalSessionId: data.journalSessionId,
    questionsAskedCount: data.questionsAskedCount,
    contextSurface: data.contextSurface,
    structuredSummary: data.structuredSummary,
    emergencyDetected: data.emergencyDetected,
    confidenceScore: data.confidenceScore,
    currentQuestion: data.currentQuestion,
    journalHealthDeepLink:
      data.journalHealthDeepLink === "vaccination" || data.journalHealthDeepLink === "medication"
        ? data.journalHealthDeepLink
        : undefined,
  };
}

export async function fetchActiveJournalSession(petId: string): Promise<JournalActiveSession | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const baseUrl = getPawbuckApiBaseUrl();
  if (!baseUrl) return null;

  const url = `${baseUrl}/api/milo/journal/sessions/active?petId=${encodeURIComponent(petId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as {
    sessionId?: string;
    treeId?: string;
    treeVersion?: string;
    phase?: string;
    questionsAskedCount?: number;
  };
  if (!data.sessionId) return null;
  return {
    sessionId: data.sessionId,
    treeId: data.treeId ?? "",
    treeVersion: data.treeVersion ?? "",
    phase: data.phase ?? "",
    questionsAskedCount: data.questionsAskedCount ?? 0,
  };
}

export async function linkJournalSessionEntry(params: {
  sessionId: string;
  petId: string;
  journalEntryId: string;
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const baseUrl = getPawbuckApiBaseUrl();
  if (!baseUrl) return;

  const url = `${baseUrl}/api/milo/journal/sessions/${encodeURIComponent(params.sessionId)}/link-entry`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      petId: params.petId,
      journalEntryId: params.journalEntryId,
    }),
  });
}

/** Thumbs up/down for a Milo assistant turn (general or journal). */
export async function submitMiloJournalFeedback(params: {
  turnId?: string;
  /** @deprecated use turnId */
  responseId?: string;
  rating: "up" | "down";
  feedbackReason?: string;
  treeVersion?: string;
  questionsAsked?: number;
  feedbackStage?: string;
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to send feedback.");
  }

  const baseUrl = getPawbuckApiBaseUrl();
  if (!baseUrl) {
    throw new Error("PawBuck API URL is not configured (EXPO_PUBLIC_PAWBUCK_API_URL).");
  }

  const id = (params.turnId ?? params.responseId ?? "").trim();
  if (!id) {
    throw new Error("turnId is required");
  }

  const fbUrl = `${baseUrl}/api/milo/chat/feedback`;
  miloDebug("POST", fbUrl, { turnId: id, rating: params.rating });

  const res = await fetch(fbUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      turnId: id,
      rating: params.rating,
      feedbackReason: params.feedbackReason,
      treeVersion: params.treeVersion,
      questionsAsked: params.questionsAsked,
      feedbackStage: params.feedbackStage,
    }),
  });

  miloDebug("feedback response", { status: res.status, ok: res.ok });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Session expired.");
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    miloDebug("feedback error body", t?.slice(0, 300) || "(empty)");
    throw new Error(t || `Feedback failed (${res.status})`);
  }
}

/** Same as `fetchMiloChat` but returns only the answer string (for the main Milo modal). */
export async function fetchMiloChatAnswer(params: {
  message: string;
  pet: Pet | null;
  history: MiloChatHistoryItem[];
  journalMode?: boolean;
}): Promise<string> {
  const r = await fetchMiloChat(params);
  return r.answer;
}
