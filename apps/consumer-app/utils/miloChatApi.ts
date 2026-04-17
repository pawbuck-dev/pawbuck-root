import { Pet } from "@/context/petsContext";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

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

  const res = await fetch(`${baseUrl}/api/milo/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message: message.trim(),
      pet: pet ? petToMiloApiContext(pet) : null,
      history,
      journalMode: journalMode ?? false,
    }),
  });

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
    throw new Error(t || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as {
    answer?: string;
    suggestedReplies?: string[];
    journalSessionComplete?: boolean;
  };
  if (!data?.answer) {
    throw new Error("No response received");
  }

  return {
    answer: data.answer,
    suggestedReplies: data.suggestedReplies,
    journalSessionComplete: data.journalSessionComplete,
  };
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
