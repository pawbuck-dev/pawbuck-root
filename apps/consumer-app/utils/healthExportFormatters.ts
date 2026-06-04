import type { Tables } from "@/database.types";
import type { Pet } from "@/context/petsContext";
import { latestVaccinationIdSet } from "@/utils/vaccinationGrouping";
import { formatPetInboundEmail } from "@/utils/petEmail";
import moment from "moment";

export type OwnerContactExport = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type PrimaryVetExport = {
  clinicName: string;
  veterinarian: string;
  phone: string;
  petEmail: string;
};

export type VaccineExportRow = {
  name: string;
  administered: string;
  validThrough: string;
  clinic: string;
  batch: string;
};

export type JurisdictionRow = {
  jurisdiction: string;
  status: string;
  notes: string;
};

export type SourceDocumentRow = {
  clinic: string;
  summary: string;
  date: string;
  verified: boolean;
};

export type HandlingTag = {
  label: string;
  variant: "neutral" | "warning" | "info";
};

export function maskMicrochip(value: string | null | undefined): string {
  const raw = (value ?? "").replace(/\s/g, "");
  if (raw.length < 8) return raw || "Not registered";
  const visible = raw.slice(-4);
  const masked = "•".repeat(Math.max(4, raw.length - 4));
  return `${masked}${visible}`;
}

export function maskPhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 7) return value?.trim() || "Not provided";
  const last2 = digits.slice(-2);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ••• ••${last2}`;
  }
  return `••• ••${last2}`;
}

export function maskPassportNumber(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.length <= 6) return raw;
  const parts = raw.split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    return `${parts.slice(0, -1).join(" ")} ${"•".repeat(Math.max(4, last.length))}`;
  }
  return `${raw.slice(0, 4)}${"•".repeat(Math.max(4, raw.length - 4))}`;
}

export function calculateAgeYears(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const birth = moment(dateOfBirth);
  if (!birth.isValid()) return null;
  return moment().diff(birth, "years");
}

export function formatAgeDisplay(dateOfBirth: string | null): string {
  const years = calculateAgeYears(dateOfBirth);
  if (years == null) return "Not set";
  return years === 1 ? "1 year" : `${years} years`;
}

export function formatAgeCompact(dateOfBirth: string | null): string {
  const years = calculateAgeYears(dateOfBirth);
  if (years == null) return "age unknown";
  return `${years}y`;
}

export function formatSexNeutered(sex: string | null | undefined): string {
  const s = (sex ?? "").trim();
  if (!s) return "Not set";
  const lower = s.toLowerCase();
  if (lower.includes("female")) return "Female (Spayed)";
  if (lower.includes("male")) return "Male (Neutered)";
  return s;
}

export function formatExportDate(iso?: string): string {
  return moment(iso ?? undefined).format("D MMM YYYY");
}

export function formatExportDateTime(iso?: string): string {
  return moment(iso ?? undefined).format("D MMM YYYY, HH:mm z");
}

export function formatWeightDisplay(
  value: number | null | undefined,
  unit: string | null | undefined
): string {
  if (value == null || !unit) return "Not set";
  const u = unit.toLowerCase();
  if (u === "lbs" || u === "lb") return `${value} lb`;
  if (u === "kg") return `${value} kg`;
  return `${value} ${unit}`;
}

export function buildPetEmail(pet: Pet): string {
  return formatPetInboundEmail(pet.email_id, pet.name);
}

export function buildLatestVaccineRows(
  vaccinations: Tables<"vaccinations">[]
): VaccineExportRow[] {
  const latestIds = latestVaccinationIdSet(vaccinations);
  return vaccinations
    .filter((v) => latestIds.has(v.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((v) => ({
      name: v.name,
      administered: formatExportDate(v.date),
      validThrough: v.next_due_date ? formatExportDate(v.next_due_date) : "—",
      clinic: v.clinic_name?.trim() || "—",
      batch: "—",
    }));
}

export function hasCoreTravelReadiness(
  pet: Pet,
  vaccinations: Tables<"vaccinations">[]
): boolean {
  if (!pet.microchip_number?.trim()) return false;
  const latestIds = latestVaccinationIdSet(vaccinations);
  const latest = vaccinations.filter((v) => latestIds.has(v.id));
  const names = latest.map((v) => v.name.toLowerCase());
  const hasRabies = names.some((n) => n.includes("rabies"));
  const hasCore = names.some(
    (n) => n.includes("dhpp") || n.includes("distemper") || n.includes("da2pp")
  );
  return hasRabies && hasCore && latest.length >= 2;
}

export function buildComplianceBanner(
  pet: Pet,
  vaccinations: Tables<"vaccinations">[],
  options?: { hasTiter?: boolean }
): { headline: string; subline: string } | null {
  const count = latestVaccinationIdSet(vaccinations).size;
  if (count === 0) {
    return {
      headline: "Vaccination records needed",
      subline: "Add vaccines in PawBuck to generate travel-ready documentation.",
    };
  }
  const ready = hasCoreTravelReadiness(pet, vaccinations);
  const latest = vaccinations.filter((v) =>
    latestVaccinationIdSet(vaccinations).has(v.id)
  );
  const rabies = latest.find((v) => v.name.toLowerCase().includes("rabies"));
  const validThrough = rabies?.next_due_date
    ? formatExportDate(rabies.next_due_date)
    : null;
  const titerNote = options?.hasTiter ? " Rabies titer on file." : "";

  if (ready) {
    return {
      headline: "Fully vaccinated — travel records on file",
      subline: `${count} vaccination record${count === 1 ? "" : "s"} on file.${titerNote}${validThrough ? ` Rabies valid through ${validThrough}.` : ""}`,
    };
  }
  return {
    headline: `${count} vaccination record${count === 1 ? "" : "s"} on file`,
    subline: `Review jurisdiction requirements before international travel.${titerNote}`,
  };
}

export function buildJurisdictionRows(
  pet: Pet,
  vaccinations: Tables<"vaccinations">[],
  options?: { hasTiter?: boolean; hasEuPassport?: boolean }
): JurisdictionRow[] {
  const ready = hasCoreTravelReadiness(pet, vaccinations);
  const status = ready ? "✓ Compliant" : "Review required";
  const notes = ready
    ? "Core vaccines and microchip on file"
    : "Complete rabies, core vaccines, and microchip";

  const euNotes =
    ready && options?.hasTiter
      ? "Titer on file · EU passport active"
      : ready
        ? options?.hasEuPassport
          ? "EU passport on file"
          : "Check titer and EU passport if applicable"
        : notes;

  return [
    { jurisdiction: "Canada", status, notes: ready ? "All core vaccines current" : notes },
    { jurisdiction: "USA", status, notes: ready ? "CDC import rules met (rabies + microchip)" : notes },
    { jurisdiction: "EU / UK", status, notes: euNotes },
    { jurisdiction: "Australia", status: "Additional required", notes: "Requires rabies RNAT + quarantine permit" },
  ];
}

export function buildHandlingTags(
  allergies: Tables<"pet_allergies">[],
  baseline: Tables<"pet_behavior_baselines"> | null
): HandlingTag[] {
  const tags: HandlingTag[] = [];
  for (const a of allergies) {
    tags.push({
      label: a.label,
      variant: "warning",
    });
  }
  if (baseline) {
    const social = baseline.social_disposition?.trim();
    if (social && /social|friendly|calm|good with/i.test(social)) {
      tags.push({ label: "Good with people", variant: "neutral" });
    }
    if (/dog|cat|other/i.test(social ?? "")) {
      tags.push({ label: "Social with other pets", variant: "neutral" });
    }
    if (baseline.food_motivation?.trim()) {
      tags.push({ label: `Food: ${baseline.food_motivation}`, variant: "info" });
    }
    if (baseline.vocalization_level?.toLowerCase().includes("quiet")) {
      tags.push({ label: "Generally quiet", variant: "neutral" });
    }
    for (const t of baseline.stress_triggers ?? []) {
      if (t?.trim()) tags.push({ label: t.trim(), variant: "neutral" });
    }
  }
  for (const a of allergies) {
    if (a.notes?.trim()) {
      tags.push({ label: a.notes.trim().slice(0, 40), variant: "warning" });
    }
  }
  return tags.slice(0, 8);
}

export function buildHandlingNarrative(
  petName: string,
  allergies: Tables<"pet_allergies">[],
  baseline: Tables<"pet_behavior_baselines"> | null
): string {
  const parts: string[] = [];
  if (baseline?.energy_notes?.trim()) parts.push(baseline.energy_notes.trim());
  if (baseline?.sleep_safe_spot?.trim()) {
    parts.push(`Safe rest spot: ${baseline.sleep_safe_spot.trim()}.`);
  }
  const allergenLabels = allergies.map((a) => a.label).filter(Boolean);
  if (allergenLabels.length > 0) {
    parts.push(
      `Do not feed ${petName} treats containing ${allergenLabels.join(", ")}.`
    );
  }
  if (parts.length === 0) {
    return `Add handling notes and behavior baseline in PawBuck for sitters and boarding.`;
  }
  return parts.join(" ");
}

export function buildSourceDocumentRows(
  vaccinations: Tables<"vaccinations">[],
  vaultDocs: Tables<"pet_documents">[],
  titerLab?: { lab: string; date: string } | null
): SourceDocumentRow[] {
  const rows: SourceDocumentRow[] = [];
  const byClinic = new Map<string, { vaccines: string[]; date: string }>();

  for (const v of vaccinations) {
    if (!v.document_url) continue;
    const clinic = v.clinic_name?.trim() || "Clinic";
    const cur = byClinic.get(clinic) ?? { vaccines: [], date: v.date };
    if (!cur.vaccines.includes(v.name)) cur.vaccines.push(v.name);
    if (new Date(v.date) < new Date(cur.date)) cur.date = v.date;
    byClinic.set(clinic, cur);
  }

  byClinic.forEach((val, clinic) => {
    rows.push({
      clinic,
      summary: val.vaccines.join(" · "),
      date: formatExportDate(val.date),
      verified: true,
    });
  });

  for (const doc of vaultDocs) {
    const extracted = doc.extracted_json as Record<string, unknown> | null;
    const title =
      (typeof extracted?.title === "string" ? extracted.title : null) ??
      doc.document_type.replace(/_/g, " ");
    rows.push({
      clinic: title,
      summary: doc.document_type.replace(/_/g, " "),
      date: formatExportDate(doc.created_at),
      verified: doc.confidence >= 50,
    });
  }

  if (titerLab) {
    rows.push({
      clinic: titerLab.lab,
      summary: "Rabies titer (FAVN)",
      date: titerLab.date,
      verified: true,
    });
  }

  return rows;
}

export function vetSummaryFreshnessLabel(generatedAt: string): string {
  const expires = moment(generatedAt).add(14, "days");
  const daysLeft = expires.diff(moment(), "days");
  if (daysLeft < 0) return "Expired — regenerate";
  return `Fresh — valid ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
}
