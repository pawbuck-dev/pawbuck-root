import { supabase } from "@/utils/supabase";

/** Minimal pet fields returned when verifying a code (preview before accept). */
export type PetTransferPreviewPet = {
  name: string;
  breed: string | null;
  photo_url: string | null;
  animal_type: string | null;
  date_of_birth: string;
  /** Present once DB migration with email in verify select is applied. */
  email_id?: string | null;
};

export type PetTransferPreviewHighlight = {
  id: string;
  entry_date: string;
  domain: string;
  subtype: string;
  note_preview: string;
};

export type PetTransferPreviewSummary = {
  vaccination_count: number;
  active_medication_count: number;
  clinical_exam_count: number;
  document_count: number;
};

/** Full recipient preview for a valid code (US-PT-006). */
export type PetTransferPreviewPayload = {
  pet: PetTransferPreviewPet;
  highlights: PetTransferPreviewHighlight[];
  summary: PetTransferPreviewSummary;
};

export async function fetchPetTransferPreview(
  code: string
): Promise<PetTransferPreviewPayload | null> {
  const { data, error } = await supabase.rpc("preview_pet_transfer", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  if (data == null || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (!raw.pet || typeof raw.pet !== "object") return null;
  return {
    pet: raw.pet as PetTransferPreviewPet,
    highlights: Array.isArray(raw.highlights)
      ? (raw.highlights as PetTransferPreviewHighlight[])
      : [],
    summary: {
      vaccination_count: Number((raw.summary as Record<string, unknown>)?.vaccination_count ?? 0),
      active_medication_count: Number(
        (raw.summary as Record<string, unknown>)?.active_medication_count ?? 0
      ),
      clinical_exam_count: Number((raw.summary as Record<string, unknown>)?.clinical_exam_count ?? 0),
      document_count: Number((raw.summary as Record<string, unknown>)?.document_count ?? 0),
    },
  };
}

export interface PetTransfer {
  id: string;
  code: string;
  pet_id: string;
  from_user_id: string;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  to_user_id: string | null;
  is_active: boolean;
  transfer_reason?: string | null;
  declined_at?: string | null;
  declined_by_user_id?: string | null;
  recipient_contact?: string | null;
  prior_owner_show_name?: boolean;
  journal_highlight_entry_ids?: string[];
  excluded_journal_entry_ids?: string[];
  prior_owner_display_snapshot?: string | null;
}

export type PetTransferWithPreview = PetTransfer & {
  pets?: PetTransferPreviewPet | null;
};

export type CreatePetTransferOptions = {
  /** Default 30 days if neither ttl nor days set */
  expiresInDays?: number;
  /** Takes precedence over expiresInDays when set (e.g. 15 for Figma “expires in 15 minutes”) */
  ttlMinutes?: number;
  transferReason?: string | null;
  /** Optional recipient email or @username (informational; US-PT-001). */
  recipientContact?: string | null;
  /** When false, transfer history shows “Previous owner” (US-PT-013). */
  priorOwnerShowName?: boolean;
  /** Up to 5 journal entry ids to highlight for the new owner (US-PT-003). */
  journalHighlightEntryIds?: string[];
  /** Journal entries to remove for the new owner; vet-flagged cannot be listed (US-PT-004). */
  excludedJournalEntryIds?: string[];
};

export type TransferPrepSnapshot = {
  weightValue: number;
  weightUnit: string;
  weightLabel: string;
  activeMedicationCount: number;
  lastVetVisitDate: string | null;
  /** Approximate whole days since last vet visit (null if unknown). */
  lastVetVisitDaysAgo: number | null;
  /** True when last visit was more than 12 months ago (US-PT-005). */
  vetVisitOlderThan12Months: boolean;
};

export type PetTransferHistoryRow = {
  id: string;
  used_at: string;
  from_user_id: string;
  to_user_id: string | null;
  prior_owner_display_snapshot: string | null;
};

/**
 * Generate a unique transfer code
 */
function generateTransferCode(petName?: string): string {
  const prefix = "TRF";
  const petPrefix = petName
    ? petName.toUpperCase().substring(0, 4).replace(/[^A-Z]/g, "")
    : "PET";
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${petPrefix}-${year}-${random}`;
}

/**
 * Create a new pet transfer code
 */
export async function createPetTransfer(
  petId: string,
  options?: number | CreatePetTransferOptions
): Promise<PetTransferWithPreview> {
  const opts: CreatePetTransferOptions =
    typeof options === "number" ? { expiresInDays: options } : options ?? {};
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  // Verify the pet belongs to the user
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, user_id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (petError || !pet) {
    throw new Error("Pet not found or you don't have permission to transfer this pet");
  }

  // Check if there's already an active transfer for this pet
  const { data: existingTransfer } = await supabase
    .from("pet_transfers")
    .select("id")
    .eq("pet_id", petId)
    .eq("from_user_id", user.id)
    .eq("is_active", true)
    .is("used_at", null)
    .single();

  if (existingTransfer) {
    throw new Error("An active transfer already exists for this pet. Please cancel it first or wait for it to expire.");
  }

  let code: string;
  let isUnique = false;

  // Generate unique code
  while (!isUnique) {
    code = generateTransferCode(pet.name);
    const { data: existing } = await supabase
      .from("pet_transfers")
      .select("id")
      .eq("code", code)
      .single();

    if (!existing) {
      isUnique = true;
    }
  }

  const expiresAt = new Date();
  if (opts.ttlMinutes != null) {
    expiresAt.setMinutes(expiresAt.getMinutes() + opts.ttlMinutes);
  } else {
    const days = opts.expiresInDays ?? 30;
    expiresAt.setDate(expiresAt.getDate() + days);
  }

  const highlightIds = (opts.journalHighlightEntryIds ?? []).filter(Boolean).slice(0, 5);
  const excludedIds = (opts.excludedJournalEntryIds ?? []).filter(Boolean);
  const intersection = highlightIds.filter((id) => excludedIds.includes(id));
  if (intersection.length > 0) {
    throw new Error("A journal entry cannot be both highlighted and excluded");
  }

  const { data, error } = await supabase
    .from("pet_transfers")
    .insert({
      code: code!,
      pet_id: petId,
      from_user_id: user.id,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      recipient_contact: opts.recipientContact?.trim() || null,
      prior_owner_show_name: opts.priorOwnerShowName !== false,
      journal_highlight_entry_ids: highlightIds,
      excluded_journal_entry_ids: excludedIds,
      ...(opts.transferReason != null && opts.transferReason !== ""
        ? { transfer_reason: opts.transferReason }
        : {}),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as PetTransferWithPreview;
}

/**
 * Get active transfers created by the current user
 */
export async function getMyPetTransfers(): Promise<PetTransferWithPreview[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase
    .from("pet_transfers")
    .select("*")
    .eq("from_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as PetTransferWithPreview[];
}

/**
 * Verify a transfer code and get transfer details (limited pet fields for preview).
 */
export async function verifyTransferCode(
  code: string
): Promise<PetTransferWithPreview | null> {
  const { data, error } = await supabase
    .from("pet_transfers")
    .select(
      "id, code, pet_id, from_user_id, created_at, expires_at, used_at, to_user_id, is_active, transfer_reason, declined_at, declined_by_user_id, pets(name, breed, photo_url, animal_type, date_of_birth, email_id)"
    )
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw error;
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Check if already used
  if (data.used_at) {
    return null;
  }

  return data as PetTransferWithPreview;
}

/**
 * Recipient declines an incoming transfer (deactivates code; owner can create a new one).
 */
export async function declinePetTransfer(code: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { error } = await supabase.rpc("decline_pet_transfer", {
    p_code: code.trim().toUpperCase(),
  });

  if (error) {
    throw new Error(error.message || "Could not decline this transfer");
  }
}

/**
 * Use a transfer code to transfer pet ownership (server-side RPC; RLS blocks direct recipient UPDATE).
 */
export async function useTransferCode(
  code: string,
  petParentDisplayName?: string | null
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { error } = await supabase.rpc("accept_pet_transfer", {
    p_code: code.trim().toUpperCase(),
    p_pet_parent_display_name: petParentDisplayName ?? null,
  });

  if (error) {
    throw new Error(error.message || "Failed to complete transfer");
  }
}

function formatWeightLabel(weightValue: number, weightUnit: string): string {
  const u = weightUnit.toLowerCase();
  return `${weightValue} ${u === "kg" || u === "lbs" ? u : weightUnit}`;
}

/**
 * Weight, medications, and last vet visit for the “verify current status” step (US-PT-005).
 */
export async function getTransferPrepSnapshot(petId: string): Promise<TransferPrepSnapshot> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be authenticated");

  const { data: pet, error: petErr } = await supabase
    .from("pets")
    .select("id, weight_value, weight_unit")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (petErr || !pet) {
    throw new Error("Pet not found or you don't have permission");
  }

  const { data: meds, error: medErr } = await supabase
    .from("medicines")
    .select("id, end_date")
    .eq("pet_id", petId);

  if (medErr) throw medErr;

  const today = new Date().toISOString().slice(0, 10);
  const activeMedicationCount = (meds ?? []).filter((m) => {
    if (!m.end_date) return true;
    return m.end_date >= today;
  }).length;

  const { data: exams, error: exErr } = await supabase
    .from("clinical_exams")
    .select("exam_date")
    .eq("pet_id", petId)
    .order("exam_date", { ascending: false })
    .limit(1);

  if (exErr) throw exErr;

  const lastVetVisitDate = exams?.[0]?.exam_date ?? null;
  let lastVetVisitDaysAgo: number | null = null;
  let vetVisitOlderThan12Months = false;
  if (lastVetVisitDate) {
    const d0 = new Date(`${lastVetVisitDate}T12:00:00Z`).getTime();
    lastVetVisitDaysAgo = Math.floor((Date.now() - d0) / 86400000);
    vetVisitOlderThan12Months = Date.now() - d0 > 365.25 * 86400000;
  }

  return {
    weightValue: Number(pet.weight_value),
    weightUnit: pet.weight_unit,
    weightLabel: formatWeightLabel(Number(pet.weight_value), pet.weight_unit),
    activeMedicationCount,
    lastVetVisitDate,
    lastVetVisitDaysAgo,
    vetVisitOlderThan12Months,
  };
}

/** Completed transfers for this pet (current owner; US-PT-013). */
export async function getPetTransferHistory(petId: string): Promise<PetTransferHistoryRow[]> {
  const { data, error } = await supabase
    .from("pet_transfers")
    .select("id, used_at, from_user_id, to_user_id, prior_owner_display_snapshot")
    .eq("pet_id", petId)
    .not("used_at", "is", null)
    .order("used_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetTransferHistoryRow[];
}

/**
 * Cancel/deactivate a transfer code
 */
export async function cancelPetTransfer(transferId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { error } = await supabase
    .from("pet_transfers")
    .update({ is_active: false })
    .eq("id", transferId)
    .eq("from_user_id", user.id); // Only creator can cancel

  if (error) {
    throw error;
  }
}

