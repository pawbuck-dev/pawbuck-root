import type { HealthExportBundle } from "@/services/healthExportBundle";
import type { ClinicalSummaryResult } from "@/services/buildClinicalSummary";
import {
  escapeHtml,
  HEALTH_EXPORT_CSS,
  watermarkHtml,
} from "@/services/healthExportPdfCommon";
import { vetSummaryVerifyPath } from "@/constants/healthExportUrls";
import {
  buildLatestVaccineRows,
  formatAgeCompact,
  formatExportDate,
  formatSexNeutered,
  formatWeightDisplay,
  maskMicrochip,
  vetSummaryFreshnessLabel,
} from "@/utils/healthExportFormatters";
import { formatPetWeightForDisplay } from "@/utils/weightUnits";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import moment from "moment";

type TemplateInput = {
  bundle: HealthExportBundle;
  clinical: ClinicalSummaryResult;
};

function parseInsuranceDoc(docs: HealthExportBundle["vaultDocuments"]) {
  const policy = docs.find((d) => d.document_type === "insurance_policy");
  if (!policy) return null;
  const ex = policy.extracted_json as Record<string, unknown> | null;
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
  return {
    title: (typeof ex?.title === "string" ? ex.title : null) ?? "Insurance policy",
    carrier: map.get("carrier") ?? map.get("insurer") ?? "On file",
    policy: map.get("policy") ?? map.get("policy number") ?? "—",
    coverage: map.get("coverage") ?? map.get("plan") ?? "—",
  };
}

export function buildVetSummaryHtml(input: TemplateInput): string {
  const { bundle, clinical } = input;
  const { pet } = bundle;
  const generated = formatExportDate(bundle.generatedAt);
  const generatedLong = moment(bundle.generatedAt).format("D MMM YYYY, HH:mm z");
  const verifyUrl = vetSummaryVerifyPath(pet.email_id ?? pet.name);
  const freshness = vetSummaryFreshnessLabel(bundle.generatedAt);
  const displayName = pet.pet_parent_display_name
    ? `${pet.name} ${pet.pet_parent_display_name.split(" ")[0] !== pet.name ? "" : ""}${pet.name}`
    : pet.name;
  const headerName = pet.pet_parent_display_name
    ? `${pet.name} · ${pet.pet_parent_display_name.split(" ").slice(-1)[0] === pet.name ? pet.name : pet.pet_parent_display_name}`
    : pet.name;

  const vaccines = buildLatestVaccineRows(bundle.vaccinations);
  const vacTable = vaccines
    .map(
      (v) => `<tr>
      <td>${escapeHtml(v.name)}</td>
      <td>${escapeHtml(v.administered)}</td>
      <td>${escapeHtml(v.validThrough)}</td>
      <td>${escapeHtml(v.clinic)}</td>
      <td>${escapeHtml(v.batch)}</td>
    </tr>`
    )
    .join("");

  const activeMeds = bundle.medicines.slice(0, 3);
  const medCard =
    activeMeds.length > 0
      ? activeMeds
          .map(
            (m) => `<div style="font-weight:700;">${escapeHtml(m.name)}</div>
        <div style="font-size:9px;color:#5a6b75;">Active prescription</div>`
          )
          .join("<br/>")
      : "No active prescriptions";

  const allergyCard =
    bundle.allergies.length > 0
      ? bundle.allergies
          .map((a) => `<div><strong>${escapeHtml(a.label)}</strong></div>`)
          .join("")
      : "No known allergies recorded";

  const chronicCard =
    bundle.conditions.filter((c) => c.status === "active").length > 0
      ? bundle.conditions
          .filter((c) => c.status === "active")
          .map((c) => `<div><strong>${escapeHtml(c.name)}</strong> <span class="pill pill-info">Active</span></div>`)
          .join("")
      : "No active chronic conditions";

  const lastExam = bundle.exams[0];
  const preventCard = `<div style="font-size:10px;">
    <div><strong>Last vet visit</strong> ${lastExam ? escapeHtml(formatExportDate(lastExam.exam_date)) : "—"}</div>
    <div style="margin-top:4px;"><strong>Vaccines on file</strong> ${bundle.vaccinations.length}</div>
  </div>`;

  const weightLogs = bundle.weightLogs;
  const weightTrend =
    weightLogs.length >= 2
      ? `${formatPetWeightForDisplay(weightLogs[0].weight_value, weightLogs[0].weight_unit) ?? "—"} (latest)`
      : formatPetWeightForDisplay(pet.weight_value, pet.weight_unit) ?? "—";

  const flagged = bundle.journal.filter((j) => journalEntryNeedsTriageAttention(j)).slice(0, 5);
  const timeline = bundle.exams.slice(0, 6).map(
    (e) => `
    <div class="card" style="margin-bottom:6px;">
      <div style="font-weight:700;font-size:11px;">${escapeHtml(formatExportDate(e.exam_date))}</div>
      <div style="font-size:10px;color:#5a6b75;">${escapeHtml(e.clinic_name ?? "Clinic visit")}${e.exam_type ? ` · ${escapeHtml(e.exam_type)}` : ""}</div>
    </div>`
  );

  const journalObs = bundle.journal.slice(0, 8).map(
    (j) => `
    <tr>
      <td>${escapeHtml(j.entry_date)}</td>
      <td>${escapeHtml((j.note ?? j.subtype ?? "Observation").slice(0, 120))}</td>
      <td>${escapeHtml(j.domain)}</td>
    </tr>`
  );

  const insurance = parseInsuranceDoc(bundle.vaultDocuments);
  const insuranceBlock = insurance
    ? `
    <div class="section-label">INSURANCE ON FILE</div>
    <div class="card">
      <div style="font-weight:700;">${escapeHtml(insurance.carrier)}</div>
      <div style="font-size:10px;margin-top:6px;">Policy: ${escapeHtml(insurance.policy)} · ${escapeHtml(insurance.coverage)}</div>
    </div>`
    : "";

  const baseline = bundle.behaviorBaseline;
  const behaviorBlock = baseline
    ? `
    <div class="section-label">BEHAVIORAL PROFILE</div>
    <div class="card" style="font-size:10px;line-height:1.5;">
      <div><strong>Social:</strong> ${escapeHtml(baseline.social_disposition)}</div>
      <div style="margin-top:4px;"><strong>Food motivation:</strong> ${escapeHtml(baseline.food_motivation)}</div>
      <div style="margin-top:4px;"><strong>Vocalization:</strong> ${escapeHtml(baseline.vocalization_level)}</div>
    </div>`
    : "";

  const confidenceHtml = clinical.confidencePercent
    ? `<span style="font-size:10px;">Confidence ${clinical.confidencePercent}%</span>`
    : `<span style="font-size:10px;color:#5a6b75;">Record-based summary</span>`;

  const narrativeBlock =
    flagged.length > 0
      ? `<div class="section-label">ACTIVE CASE NARRATIVES</div>
    <div class="card" style="font-size:10px;line-height:1.5;">
      <div style="font-weight:700;margin-bottom:6px;">Owner-flagged journal (${flagged.length})</div>
      ${escapeHtml(flagged[0].note?.slice(0, 400) ?? "See journal in PawBuck.")}
    </div>`
      : "";

  const appendix = bundle.vaultDocuments
    .slice(0, 8)
    .map(
      (d) =>
        `<span class="pill">${escapeHtml(d.document_type.replace(/_/g, " "))} ${d.confidence >= 50 ? "✓" : ""}</span>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${HEALTH_EXPORT_CSS}
    .pet-strip { background:#e8f4fc; border-radius:10px; padding:12px; margin-bottom:12px; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .grid-4 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .mini-card { background:#fff; border:1px solid #e5eaee; border-radius:8px; padding:10px; min-height:72px; }
    .fresh { background:#26c1c1; color:#fff; font-size:9px; font-weight:700; padding:4px 10px; border-radius:10px; display:inline-block; }
  </style></head><body>

  <div class="page">
    ${watermarkHtml()}
    <div class="content">
      <div class="header-row">
        <div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">VETERINARY SUMMARY</div></div>
        <div class="page-meta">01 / 04<br/>Generated ${escapeHtml(generatedLong)}<br/><span class="fresh">${escapeHtml(freshness)}</span><br/>Verify: ${escapeHtml(verifyUrl)}</div>
      </div>
      <div class="pet-strip">
        <div style="font-size:18px;font-weight:800;color:#2d4a6f;">${escapeHtml(headerName)}</div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px;font-size:9px;">
          <div><div class="field-label">SPECIES</div><div class="field-value">${escapeHtml(pet.animal_type)}</div></div>
          <div><div class="field-label">BREED</div><div class="field-value">${escapeHtml(pet.breed)}</div></div>
          <div><div class="field-label">DOB</div><div class="field-value">${escapeHtml(pet.date_of_birth ? formatExportDate(pet.date_of_birth) : "—")}</div></div>
          <div><div class="field-label">SEX</div><div class="field-value">${escapeHtml(formatSexNeutered(pet.sex))}</div></div>
          <div><div class="field-label">WEIGHT</div><div class="field-value">${escapeHtml(formatWeightDisplay(pet.weight_value, pet.weight_unit))}</div></div>
          <div><div class="field-label">MICROCHIP</div><div class="field-value">${escapeHtml(maskMicrochip(pet.microchip_number))}</div></div>
        </div>
      </div>
      <div class="banner-teal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-weight:700;font-size:11px;">MILO AI — CLINICAL SUMMARY</div>
          ${confidenceHtml}
        </div>
        <div style="font-size:10px;line-height:1.55;">${escapeHtml(clinical.narrative)}</div>
      </div>
      <div class="section-label">ACTIVE CLINICAL PICTURE <span style="font-weight:500;color:#6b7280;">at-a-glance</span></div>
      <div class="grid-4">
        <div class="mini-card"><div class="field-label">CURRENT MEDICATIONS</div>${medCard}</div>
        <div class="mini-card"><div class="field-label">ALLERGIES</div>${allergyCard}</div>
        <div class="mini-card"><div class="field-label">CHRONIC &amp; PRE-EXISTING</div>${chronicCard}</div>
        <div class="mini-card"><div class="field-label">PREVENTATIVES</div>${preventCard}</div>
      </div>
    </div>
    <div class="footer">${escapeHtml(displayName)} · ${escapeHtml(bundle.petEmail)} · Page 1 of 4 · Generated ${escapeHtml(generated)}</div>
  </div>

  <div class="page">
    ${watermarkHtml()}
    <div class="content">
      <div class="header-row"><div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">VETERINARY SUMMARY</div></div><div class="page-meta">02 / 04</div></div>
      <div style="font-weight:700;margin-bottom:8px;">${escapeHtml(pet.name)} · ${escapeHtml(formatAgeCompact(pet.date_of_birth))} · ${escapeHtml(formatWeightDisplay(pet.weight_value, pet.weight_unit))}</div>
      <div class="section-label">TRENDING VITALS</div>
      <div class="grid-2">
        <div class="mini-card"><div class="field-label">WEIGHT</div><div style="font-weight:700;">${escapeHtml(weightTrend)}</div></div>
        <div class="mini-card"><div class="field-label">ACTIVITY (journal)</div><div style="font-weight:700;">${bundle.journal.length} entries</div></div>
      </div>
      <div class="section-label">VACCINATION HISTORY</div>
      <table><thead><tr><th>Vaccine</th><th>Date</th><th>Next due</th><th>Clinic</th><th>Batch</th></tr></thead><tbody>${vacTable || '<tr><td colspan="5">None recorded</td></tr>'}</tbody></table>
    </div>
    <div class="footer">${escapeHtml(bundle.petEmail)} · Page 2 of 4</div>
  </div>

  <div class="page">
    ${watermarkHtml()}
    <div class="content">
      <div class="header-row"><div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">VETERINARY SUMMARY</div></div><div class="page-meta">03 / 04</div></div>
      ${narrativeBlock}
      <div class="section-label">MEDICAL TIMELINE</div>
      ${timeline.join("") || '<div class="card">No clinic visits recorded</div>'}
      <div class="section-label" style="margin-top:12px;">PARENT-REPORTED OBSERVATIONS (recent)</div>
      <table><thead><tr><th>Date</th><th>Observation</th><th>Domain</th></tr></thead><tbody>${journalObs.join("") || '<tr><td colspan="3">None</td></tr>'}</tbody></table>
    </div>
    <div class="footer">${escapeHtml(bundle.petEmail)} · Page 3 of 4</div>
  </div>

  <div class="page">
    ${watermarkHtml()}
    <div class="content">
      <div class="header-row"><div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">VETERINARY SUMMARY</div></div><div class="page-meta">04 / 04</div></div>
      ${insuranceBlock}
      ${behaviorBlock}
      <div class="section-label">APPENDIX — SOURCE DOCUMENTS</div>
      <div>${appendix || '<span style="color:#6b7280;font-size:10px;">No vault documents</span>'}</div>
      <div style="font-size:8px;color:#6b7280;margin-top:14px;line-height:1.4;">
        Valid 14 days from generation. AI-synthesized sections are not a substitute for clinical judgment.
        Source records: ${escapeHtml(verifyUrl)}
      </div>
    </div>
    <div class="footer">${escapeHtml(headerName)} · ${escapeHtml(bundle.petEmail)} · Page 4 of 4 · Generated ${escapeHtml(generated)}</div>
  </div>
  </body></html>`;
}
