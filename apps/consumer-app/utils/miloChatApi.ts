import { Pet } from "@/context/petsContext";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

/** Set `EXPO_PUBLIC_MILO_DEBUG=true` in .env.local to log Milo requests in non-dev builds. */
function miloDebug(...args: unknown[]) {
  if (__DEV__ || process.env.EXPO_PUBLIC_MILO_DEBUG === "true") {
    console.log("[Milo API]", ...args);
  }
}

/** API returned 402 Payment Required — PawBuck Premium required. */
export class SubscriptionRequiredError extends Error {
  readonly code = "subscription_required" as const;
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionRequiredError";
  }
}

export type MiloChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type MiloChatApiResult = {
  answer: string;
  suggestedReplies?: string[];
  journalSessionComplete?: boolean;
  /** Journal mode: server turn id for POST /api/milo/chat/feedback */
  responseId?: string;
  promptVersion?: string;
  heuristicTags?: string[];
};

/** Pet fields sent to POST /api/milo/chat (matches chatContext PetContext). */
export function petToMiloApiContext(pet: Pet) {
  return {
    id: pet.id,
    name: pet.name,
    animal_type: pet.animal_type,
    breed: pet.breed,
    date_of_birth: pet.date_of_birth,
    sex: pet.sex,
    weight_value: pet.weight_value,
    weight_unit: pet.weight_unit,
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
}): Promise<MiloChatApiResult> {
  const { message, pet, history, journalMode } = params;

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
    let msg = "PawBuck Premium is required to chat with Milo.";
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new SubscriptionRequiredError(msg);
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
    responseId?: string;
    promptVersion?: string;
    heuristicTags?: string[];
    usedPetData?: boolean;
    usedRag?: boolean;
  };
  if (!data?.answer) {
    miloDebug("error: JSON had no answer field", data);
    throw new Error("No response received");
  }

  const looksLikeServerTrouble =
    data.answer.includes("Sorry, I'm having trouble") ||
    data.answer.includes("not quite configured") ||
    data.answer.includes("Woof! Something went wrong");

  if (looksLikeServerTrouble) {
    miloDebug("warning: API returned 200 but answer looks like a failure path — check PawBuck.API logs / Gemini / DB", {
      answerPreview: data.answer.slice(0, 160),
      journalMode: journalMode ?? false,
      usedPetData: data.usedPetData,
      responseId: data.responseId,
      promptVersion: data.promptVersion,
    });
  } else {
    miloDebug("ok", {
      answerLength: data.answer.length,
      usedPetData: data.usedPetData,
      responseId: data.responseId,
      promptVersion: data.promptVersion,
      heuristicTags: data.heuristicTags,
    });
  }

  return {
    answer: data.answer,
    suggestedReplies: data.suggestedReplies,
    journalSessionComplete: data.journalSessionComplete,
    responseId: data.responseId,
    promptVersion: data.promptVersion,
    heuristicTags: data.heuristicTags,
  };
}

/** Thumbs up/down for a journal Milo assistant turn. */
export async function submitMiloJournalFeedback(params: {
  responseId: string;
  rating: "up" | "down";
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

  const fbUrl = `${baseUrl}/api/milo/chat/feedback`;
  miloDebug("POST", fbUrl, { responseId: params.responseId, rating: params.rating });

  const res = await fetch(fbUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      responseId: params.responseId,
      rating: params.rating,
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
