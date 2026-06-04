import type { Tables } from "@/database.types";
import type { HealthExportBundle } from "@/services/healthExportBundle";
import type { LabResult, LabTestResult } from "@/services/labResults";
import type { MedicineData } from "@/types/medication";
import { formatExportDate } from "@/utils/healthExportFormatters";
import { formatPetWeightForDisplay } from "@/utils/weightUnits";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import moment from "moment";

export type TrendingVitalRow = {
  label: string;
  value: string;
  trend: string;
};

export type LabMarkerRow = {
  name: string;
  value: string;
  unit: string;
  status: "normal" | "low" | "high";
};

export type TravelTiterInfo = {
  result: string;
  resultNumeric: number | null;
  lab: string;
  date: string;
  meetsEuThreshold: boolean;
  source: "lab" | "vault";
};

export type TravelCertificateInfo = {
  title: string;
  date: string;
  summary: string;
};

export type MedicalTimelineEvent = {
  date: string;
  dateLabel: string;
  title: string;
  subtitle: string;
  sortKey: number;
};

export type CaseNarrative = {
  title: string;
  body: string;
  sources: string;
};

export type PreventativeRow = {
  category: string;
  detail: string;
};

export type WorkupLabRow = {
  panel: string;
  testName: string;
  value: string;
  referenceRange: string;
  status: "normal" | "low" | "high";
};

export type ParsedInsurance = {
  title: string;
  carrier: string;
  policy: string;
  coverage: string;
  deductible: string | null;
  waitingPeriod: string | null;
  reimbursement: string | null;
};

function keyFactsMap(doc: Tables<"pet_documents">): Map<string, string> {
  const ex = doc.extracted_json as Record<string, unknown> | null;
  const facts = Array.isArray(ex?.keyFacts) ? ex.keyFacts : [];
  const map = new Map<string, string>();
  for (const f of facts) {
    if (f && typeof f === "object") {
      const r = f as Record<string, unknown>;
      if (typeof r.label === "string" && typeof r.value === "string") {
        map.set(r.label.toLowerCase(), r.value);
      }
    }
  }
  return map;
}

function parseTiterFromText(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:iu\/ml|iu\/mL|IU\/mL)/i);
  if (match) return parseFloat(match[1]);
  return null;
}

function isRabiesTiterLike(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("titer") ||
    lower.includes("favn") ||
    lower.includes("rnat") ||
    lower.includes("neutralizing antibod")
  );
}

export function parseTravelAndTiterDocs(
  vaultDocuments: Tables<"pet_documents">[],
  labResults: LabResult[]
): { titer: TravelTiterInfo | null; travelCerts: TravelCertificateInfo[] } {
  const travelCerts: TravelCertificateInfo[] = [];

  for (const doc of vaultDocuments) {
    if (doc.document_type === "travel_certificate") {
      const ex = doc.extracted_json as Record<string, unknown> | null;
      const title =
        (typeof ex?.title === "string" ? ex.title : null) ??
        "Travel certificate";
      const summary =
        (typeof ex?.summary === "string" ? ex.summary : null) ?? "On file";
      travelCerts.push({
        title,
        date: formatExportDate(doc.created_at),
        summary,
      });
    }
  }

  for (const lab of labResults) {
    const haystack = `${lab.test_type} ${lab.lab_name}`.toLowerCase();
    if (!isRabiesTiterLike(haystack)) continue;
    for (const r of lab.results ?? []) {
      const numeric = parseTiterFromText(`${r.value} ${r.unit}`);
      if (numeric != null) {
        return {
          titer: {
            result: `${numeric} IU/mL`,
            resultNumeric: numeric,
            lab: lab.lab_name,
            date: formatExportDate(lab.test_date ?? lab.created_at),
            meetsEuThreshold: numeric >= 0.5,
            source: "lab",
          },
          travelCerts,
        };
      }
    }
  }

  for (const doc of vaultDocuments) {
    const map = keyFactsMap(doc);
    const result =
      map.get("result") ??
      map.get("titer") ??
      map.get("titer result") ??
      map.get("rabies titer");
    if (!result) continue;
    const numeric = parseTiterFromText(result);
    if (numeric == null && !isRabiesTiterLike(result)) continue;
    const n = numeric ?? parseFloat(result);
    if (Number.isNaN(n)) continue;
    return {
      titer: {
        result: `${n} IU/mL`,
        resultNumeric: n,
        lab: map.get("lab") ?? map.get("laboratory") ?? "On file",
        date:
          map.get("date") ??
          map.get("test date") ??
          formatExportDate(doc.created_at),
        meetsEuThreshold: n >= 0.5,
        source: "vault",
      },
      travelCerts,
    };
  }

  return { titer: null, travelCerts };
}

export function parseInsuranceDoc(
  docs: Tables<"pet_documents">[]
): ParsedInsurance | null {
  const policy = docs.find((d) => d.document_type === "insurance_policy");
  if (!policy) return null;
  const ex = policy.extracted_json as Record<string, unknown> | null;
  const map = keyFactsMap(policy);
  return {
    title: (typeof ex?.title === "string" ? ex.title : null) ?? "Insurance policy",
    carrier: map.get("carrier") ?? map.get("insurer") ?? "On file",
    policy: map.get("policy") ?? map.get("policy number") ?? "—",
    coverage: map.get("coverage") ?? map.get("plan") ?? "—",
    deductible: map.get("deductible") ?? map.get("deductible (per condition)") ?? null,
    waitingPeriod: map.get("waiting period") ?? null,
    reimbursement: map.get("reimbursement") ?? null,
  };
}

export function parseEuPassportMeta(
  pet: HealthExportBundle["pet"],
  vaultDocuments: Tables<"pet_documents">[]
): { issuedBy: string | null; country: string | null } {
  for (const doc of vaultDocuments) {
    const dt = doc.document_type.toLowerCase();
    if (!dt.includes("passport") && dt !== "travel_certificate") continue;
    const map = keyFactsMap(doc);
    const issuedBy =
      map.get("issued by") ?? map.get("veterinarian") ?? map.get("vet") ?? null;
    const country = map.get("country") ?? map.get("issued country") ?? null;
    if (issuedBy || country) return { issuedBy, country };
  }
  return { issuedBy: null, country: pet.country?.trim() || null };
}

function avgIntakeGramsPerDay(history: HealthExportBundle["dailyIntakeHistory"]): number | null {
  const withFood = history.filter((d) => d.food_intake > 0);
  if (withFood.length === 0) return null;
  const sum = withFood.reduce((acc, d) => acc + d.food_intake, 0);
  return Math.round(sum / withFood.length);
}

function avgWaterMlPerDay(
  history: HealthExportBundle["dailyIntakeHistory"],
  pet: HealthExportBundle["pet"]
): number | null {
  const withWater = history.filter((d) => d.water_intake > 0);
  if (withWater.length === 0) return null;
  const mlPerCup =
    (pet as { intake_water_ml_per_cup?: number | null }).intake_water_ml_per_cup ?? 240;
  const sum = withWater.reduce((acc, d) => acc + d.water_intake * mlPerCup, 0);
  return Math.round(sum / withWater.length);
}

function avgWalkMinutesPerDay(sessions: HealthExportBundle["walkSessions"]): number | null {
  if (sessions.length === 0) return null;
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const day = moment(s.ended_at).format("YYYY-MM-DD");
    byDay.set(day, (byDay.get(day) ?? 0) + s.duration_seconds / 60);
  }
  const days = byDay.size;
  if (days === 0) return null;
  const total = [...byDay.values()].reduce((a, b) => a + b, 0);
  return Math.round(total / days);
}

export function buildTrendingVitals(bundle: HealthExportBundle): TrendingVitalRow[] {
  const rows: TrendingVitalRow[] = [];
  const { weightLogs, pet } = bundle;

  if (weightLogs.length > 0) {
    const values = weightLogs.map((w) => w.weight_value);
    const latest = formatPetWeightForDisplay(
      weightLogs[0].weight_value,
      weightLogs[0].weight_unit
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range =
      weightLogs.length >= 2
        ? `${formatPetWeightForDisplay(min, weightLogs[0].weight_unit)}–${formatPetWeightForDisplay(max, weightLogs[0].weight_unit)}`
        : "single reading";
    rows.push({
      label: "WEIGHT",
      value: latest ?? "—",
      trend: weightLogs.length >= 2 ? `Stable · ${range} range` : "Latest on file",
    });
  } else if (pet.weight_value != null) {
    rows.push({
      label: "WEIGHT",
      value: formatPetWeightForDisplay(pet.weight_value, pet.weight_unit) ?? "—",
      trend: "From pet profile",
    });
  }

  const foodAvg = avgIntakeGramsPerDay(bundle.dailyIntakeHistory);
  if (foodAvg != null) {
    rows.push({
      label: "FOOD INTAKE",
      value: `${foodAvg} g/day`,
      trend: `Avg over ${bundle.dailyIntakeHistory.filter((d) => d.food_intake > 0).length} logged days`,
    });
  }

  const waterAvg = avgWaterMlPerDay(bundle.dailyIntakeHistory, pet);
  if (waterAvg != null) {
    rows.push({
      label: "WATER INTAKE",
      value: `${waterAvg} ml/day`,
      trend: "Owner-logged average",
    });
  }

  const walkMin = avgWalkMinutesPerDay(bundle.walkSessions);
  if (walkMin != null) {
    rows.push({
      label: "ACTIVITY",
      value: `${walkMin} min/day`,
      trend: "From Pawthon walks (6 mo)",
    });
  } else {
    const healthJournal = bundle.journal.filter((j) => j.domain === "health").length;
    if (healthJournal > 0) {
      rows.push({
        label: "ACTIVITY (journal)",
        value: `${healthJournal} health entries`,
        trend: "Walk data not logged",
      });
    }
  }

  return rows;
}

export function buildLabMarkerRows(labResults: LabResult[]): LabMarkerRow[] {
  const latestByName = new Map<string, LabTestResult & { date: string }>();

  for (const lab of labResults) {
    const date = lab.test_date ?? lab.created_at;
    for (const r of lab.results ?? []) {
      const key = r.testName.toLowerCase();
      const existing = latestByName.get(key);
      if (!existing || new Date(date) > new Date(existing.date)) {
        latestByName.set(key, { ...r, date });
      }
    }
  }

  return [...latestByName.values()]
    .slice(0, 12)
    .map((r) => ({
      name: r.testName,
      value: r.value,
      unit: r.unit,
      status: r.status,
    }));
}

export function buildAbnormalLabNote(markers: LabMarkerRow[]): string | null {
  const abnormal = markers.filter((m) => m.status !== "normal");
  if (abnormal.length === 0) return null;
  const names = abnormal.map((a) => `${a.name} (${a.value} ${a.unit})`).join(", ");
  return `Values outside reference range: ${names}.`;
}

export function buildWorkupLabRows(labResults: LabResult[]): WorkupLabRow[] {
  const latest = labResults[0];
  if (!latest?.results?.length) return [];
  return latest.results
    .filter((r) => r.status !== "normal")
    .slice(0, 8)
    .map((r) => ({
      panel: latest.test_type,
      testName: r.testName,
      value: `${r.value} ${r.unit}`.trim(),
      referenceRange: r.referenceRange,
      status: r.status,
    }));
}

const PREVENTATIVE_PATTERN =
  /heartworm|flea|tick|simparica|nexgard|bravecto|sentinel|revolution|interceptor|advantage|prevent/i;

export function buildPreventativeRows(
  medicines: MedicineData[],
  exams: HealthExportBundle["exams"]
): PreventativeRow[] {
  const rows: PreventativeRow[] = [];

  for (const m of medicines) {
    const haystack = `${m.name} ${m.purpose ?? ""} ${m.type ?? ""}`;
    if (!PREVENTATIVE_PATTERN.test(haystack)) continue;
    const parts = [m.dosage, m.frequency].filter(Boolean).join(" · ");
    const last = m.last_given_at ? `last dose ${formatExportDate(m.last_given_at)}` : null;
    const prescriber = m.prescribed_by?.trim();
    rows.push({
      category: m.name,
      detail: [parts, last, prescriber ? `Dr. ${prescriber}` : null].filter(Boolean).join(" · "),
    });
  }

  for (const e of exams) {
    const text = `${e.findings ?? ""} ${e.notes ?? ""}`.toLowerCase();
    if (text.includes("tartar") || text.includes("dental") || text.includes("clean")) {
      rows.push({
        category: "Dental",
        detail: e.findings?.slice(0, 120) ?? `Noted ${formatExportDate(e.exam_date)}`,
      });
      break;
    }
  }

  return rows.slice(0, 4);
}

export function buildMedicalTimeline(bundle: HealthExportBundle): MedicalTimelineEvent[] {
  const events: MedicalTimelineEvent[] = [];

  for (const e of bundle.exams) {
    const title = e.exam_type?.trim() || "Clinic visit";
    const detail = e.findings?.trim() || e.notes?.trim() || "";
    events.push({
      date: e.exam_date,
      dateLabel: formatExportDate(e.exam_date),
      title,
      subtitle: [e.clinic_name, detail].filter(Boolean).join(" · ").slice(0, 160),
      sortKey: new Date(e.exam_date).getTime(),
    });
  }

  for (const v of bundle.vaccinations) {
    if (!v.document_url) continue;
    events.push({
      date: v.date,
      dateLabel: formatExportDate(v.date),
      title: `${v.name} · documented`,
      subtitle: v.clinic_name ?? "Vaccination record on file",
      sortKey: new Date(v.date).getTime(),
    });
  }

  for (const j of bundle.journal) {
    if (!journalEntryNeedsTriageAttention(j)) continue;
    events.push({
      date: j.entry_date,
      dateLabel: formatExportDate(j.entry_date),
      title: j.subtype || "Owner concern",
      subtitle: (j.note ?? "").slice(0, 160),
      sortKey: new Date(j.entry_date).getTime(),
    });
  }

  return events.sort((a, b) => b.sortKey - a.sortKey).slice(0, 10);
}

export function buildCaseNarratives(bundle: HealthExportBundle): CaseNarrative[] {
  const narratives: CaseNarrative[] = [];
  const activeConditions = bundle.conditions.filter((c) => c.status === "active");
  const flagged = bundle.journal.filter((j) => journalEntryNeedsTriageAttention(j));

  if (activeConditions.length > 0 || flagged.length > 0) {
    const conditionNames = activeConditions.map((c) => c.name).join(", ");
    const journalNotes = flagged
      .slice(0, 3)
      .map((j) => `${j.entry_date}: ${(j.note ?? j.subtype ?? "Concern").slice(0, 200)}`)
      .join(" ");
    const relatedExams = bundle.exams
      .filter((e) => {
        const t = `${e.findings ?? ""} ${e.notes ?? ""}`.toLowerCase();
        return activeConditions.some((c) => t.includes(c.name.toLowerCase().slice(0, 8)));
      })
      .slice(0, 2);

    const bodyParts: string[] = [];
    if (conditionNames) bodyParts.push(`Active conditions on file: ${conditionNames}.`);
    if (journalNotes) bodyParts.push(journalNotes);
    for (const e of relatedExams) {
      bodyParts.push(
        `Clinic visit ${formatExportDate(e.exam_date)}${e.clinic_name ? ` (${e.clinic_name})` : ""}: ${(e.findings ?? e.notes ?? "").slice(0, 180)}`
      );
    }

    if (bodyParts.length > 0) {
      const sources: string[] = [];
      if (relatedExams.length) sources.push(`${relatedExams.length} clinic visit(s)`);
      if (flagged.length) sources.push(`${flagged.length} journal entries`);
      if (bundle.labResults.length) sources.push(`${bundle.labResults.length} lab panel(s)`);

      narratives.push({
        title: activeConditions[0]?.name ?? "Active concern",
        body: bodyParts.join(" "),
        sources: sources.join(" · ") || "PawBuck records",
      });
    }
  }

  return narratives;
}

export function filterRecentJournalObservations(
  bundle: HealthExportBundle,
  days = 90
): HealthExportBundle["journal"] {
  const cutoff = moment().subtract(days, "days").startOf("day");
  return bundle.journal
    .filter((j) => moment(j.entry_date).isSameOrAfter(cutoff))
    .slice(0, 12);
}

export function formatMedicationCardLine(m: MedicineData): string {
  const parts = [m.dosage, m.frequency].filter(Boolean).join(" · ");
  const last = m.last_given_at ? `last dose ${formatExportDate(m.last_given_at)}` : null;
  const prescriber = m.prescribed_by?.trim();
  const meta = [parts, last, prescriber ? `Dr. ${prescriber}` : null].filter(Boolean).join(" · ");
  return meta || "Active prescription";
}
