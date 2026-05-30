import type { Tables } from "@/database.types";
import type { Pet } from "@/context/petsContext";
import { fetchHealthBriefingBundle, type HealthBriefingBundle } from "@/services/healthBriefing";
import { getCareTeamMembersForPet } from "@/services/careTeamMembers";
import { listWeightLogs } from "@/services/petWeightLogs";
import { getBaselineContext } from "@/services/behaviorBaseline";
import { supabase } from "@/utils/supabase";
import { resolveAuthDisplayName } from "@/services/authDisplayName";
import {
  buildPetEmail,
  type OwnerContactExport,
  type PrimaryVetExport,
} from "@/utils/healthExportFormatters";
import { pickPrimaryVetGreetingName } from "@/utils/buildVetMessageFromJournalSession";
import type { User } from "@supabase/supabase-js";

export type HealthExportBundle = HealthBriefingBundle & {
  pet: Pet;
  vaccinations: Tables<"vaccinations">[];
  vaultDocuments: Tables<"pet_documents">[];
  weightLogs: Tables<"pet_weight_logs">[];
  behaviorBaseline: Tables<"pet_behavior_baselines"> | null;
  owner: OwnerContactExport;
  primaryVet: PrimaryVetExport | null;
  petEmail: string;
  generatedAt: string;
};

function pickPrimaryVet(members: Awaited<ReturnType<typeof getCareTeamMembersForPet>>): PrimaryVetExport | null {
  const vets = members.filter((m) => (m.type ?? "").toLowerCase() === "veterinarian");
  const pool = vets.length > 0 ? vets : members;
  if (pool.length === 0) return null;
  const m = pool[0];
  const name = pickPrimaryVetGreetingName(
    pool.map((x) => ({
      vet_name: x.vet_name ?? "",
      clinic_name: x.clinic_name ?? "",
      type: x.type ?? null,
    }))
  );
  return {
    clinicName: m.clinic_name?.trim() || "Primary clinic",
    veterinarian: name ? `${name}, DVM` : "Veterinarian",
    phone: m.phone?.trim() || "Not provided",
    petEmail: "",
  };
}

function buildOwnerFromUser(user: User | null, pet: Pet): OwnerContactExport {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const name =
    pet.pet_parent_display_name?.trim() ||
    resolveAuthDisplayName(user) ||
    "Pet parent";
  const email = user?.email?.trim() || "Not provided";
  const phone =
    (typeof meta?.phone === "string" ? meta.phone : null) ||
    (typeof meta?.phone_number === "string" ? meta.phone_number : null) ||
    "Not provided";
  const address =
    (typeof meta?.address === "string" ? meta.address : null) ||
    (typeof meta?.full_address === "string" ? meta.full_address : null) ||
    pet.country?.trim() ||
    "Not provided";

  return { name, email, phone, address };
}

/** Unified fetch for Pet Passport and Veterinary Summary PDFs. */
export async function fetchHealthExportBundle(pet: Pet): Promise<HealthExportBundle> {
  const [
    briefing,
    careTeam,
    weightLogs,
    behaviorBaseline,
    vaultRes,
    vacRes,
    authRes,
  ] = await Promise.all([
    fetchHealthBriefingBundle(pet.id),
    getCareTeamMembersForPet(pet.id),
    listWeightLogs(pet.id, 24),
    getBaselineContext(pet.id),
    supabase
      .from("pet_documents")
      .select("*")
      .eq("pet_id", pet.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("vaccinations")
      .select("*")
      .eq("pet_id", pet.id)
      .order("date", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  if (vacRes.error) throw vacRes.error;
  if (vaultRes.error) throw vaultRes.error;

  const petEmail = buildPetEmail(pet);
  const primaryVet = pickPrimaryVet(careTeam);
  if (primaryVet) primaryVet.petEmail = petEmail;

  return {
    ...briefing,
    pet,
    vaccinations: vacRes.data ?? [],
    vaultDocuments: vaultRes.data ?? [],
    weightLogs: weightLogs ?? [],
    behaviorBaseline,
    owner: buildOwnerFromUser(authRes.data.user, pet),
    primaryVet,
    petEmail,
    generatedAt: new Date().toISOString(),
  };
}
