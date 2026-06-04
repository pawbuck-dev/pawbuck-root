import type { HealthExportBundle } from "@/services/healthExportBundle";
import type { ClinicalSummaryResult } from "@/services/buildClinicalSummary";
import {
  compactPages,
  renderExportPages,
  section,
  type ExportPage,
} from "@/services/healthExportPageBuilder";
import {
  escapeHtml,
  HEALTH_EXPORT_CSS,
  watermarkHtml,
} from "@/services/healthExportPdfCommon";
import { vetSummaryVerifyPath } from "@/constants/healthExportUrls";
import {
  buildLatestVaccineRows,
  buildSourceDocumentRows,
  formatAgeCompact,
  formatExportDate,
  formatSexNeutered,
  formatWeightDisplay,
  maskMicrochip,
  vetSummaryFreshnessLabel,
} from "@/utils/healthExportFormatters";
import {
  buildAbnormalLabNote,
  buildCaseNarratives,
  buildLabMarkerRows,
  buildMedicalTimeline,
  buildPreventativeRows,
  buildTrendingVitals,
  buildWorkupLabRows,
  filterRecentJournalObservations,
  formatMedicationCardLine,
  parseInsuranceDoc,
  parseTravelAndTiterDocs,
} from "@/utils/healthExportDerived";
import moment from "moment";

type TemplateInput = {
  bundle: HealthExportBundle;
  clinical: ClinicalSummaryResult;
  qrDataUri?: string | null;
};

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function vetHeader(subtitle: string, pageNum: number, total: number, extraMeta = ""): string {
  return `<div class="header-row">
    <div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">VETERINARY SUMMARY</div></div>
    <div class="page-meta">${padPageNum(pageNum)} / ${padPageNum(total)}${extraMeta ? `<br/>${extraMeta}` : ""}</div>
  </div>
  <div style="font-weight:700;margin-bottom:8px;">${escapeHtml(subtitle)}</div>`;
}

export function buildVetSummaryHtml(input: TemplateInput): string {
  const { bundle, clinical, qrDataUri } = input;
  const { pet } = bundle;
  const generated = formatExportDate(bundle.generatedAt);
  const generatedLong = moment(bundle.generatedAt).format("D MMM YYYY, HH:mm z");
  const verifyUrl = vetSummaryVerifyPath(pet.email_id ?? pet.name);
  const freshness = vetSummaryFreshnessLabel(bundle.generatedAt);
  const headerName = pet.pet_parent_display_name
    ? `${pet.name} · ${pet.pet_parent_display_name}`
    : pet.name;
  const petSubtitle = `${pet.name} · ${formatAgeCompact(pet.date_of_birth)} · ${formatWeightDisplay(pet.weight_value, pet.weight_unit)}`;

  const vaccines = buildLatestVaccineRows(bundle.vaccinations);
  const showBatchCol = vaccines.some((v) => v.batch !== "—");
  const vacTable = vaccines
    .map(
      (v) => `<tr>
      <td>${escapeHtml(v.name)}</td>
      <td>${escapeHtml(v.administered)}</td>
      <td>${escapeHtml(v.validThrough)}</td>
      <td>${escapeHtml(v.clinic)}</td>
      ${showBatchCol ? `<td>${escapeHtml(v.batch)}</td>` : ""}
    </tr>`
    )
    .join("");

  const { titer } = parseTravelAndTiterDocs(bundle.vaultDocuments, bundle.labResults);
  const titerFootnote = titer
    ? `<div style="font-size:9px;color:#5a6b75;margin-top:8px;">Rabies titer on file: ${escapeHtml(titer.result)} (${escapeHtml(titer.lab)}, ${escapeHtml(titer.date)})${titer.meetsEuThreshold ? " — meets EU/UK entry threshold ≥0.5 IU/mL." : "."}</div>`
    : "";

  const activeMeds = bundle.medicines.slice(0, 4);
  const medCard =
    activeMeds.length > 0
      ? activeMeds
          .map(
            (m) => `<div style="font-weight:700;">${escapeHtml(m.name)}</div>
        <div style="font-size:9px;color:#5a6b75;">${escapeHtml(formatMedicationCardLine(m))}</div>`
          )
          .join("<br/>")
      : "No active prescriptions";

  const allergyCard =
    bundle.allergies.length > 0
      ? bundle.allergies
          .map(
            (a) =>
              `<div><strong>${escapeHtml(a.label)}</strong>${a.notes ? `<div style="font-size:9px;color:#5a6b75;">${escapeHtml(a.notes)}</div>` : ""}</div>`
          )
          .join("")
      : "No known allergies recorded";

  const activeConditions = bundle.conditions.filter((c) => c.status === "active");
  const chronicCard =
    activeConditions.length > 0
      ? activeConditions
          .map((c) => {
            const meta = [c.diagnosed_on ? `Onset ${formatExportDate(c.diagnosed_on)}` : null, c.notes?.trim()]
              .filter(Boolean)
              .join(" · ");
            return `<div><strong>${escapeHtml(c.name)}</strong> <span class="pill pill-info">Active</span>${meta ? `<div style="font-size:9px;color:#5a6b75;">${escapeHtml(meta)}</div>` : ""}</div>`;
          })
          .join("")
      : "No active chronic conditions";

  const preventRows = buildPreventativeRows(bundle.medicines, bundle.exams);
  const preventCard =
    preventRows.length > 0
      ? preventRows
          .map(
            (p) =>
              `<div><strong>${escapeHtml(p.category)}</strong><div style="font-size:9px;color:#5a6b75;">${escapeHtml(p.detail)}</div></div>`
          )
          .join("<br/>")
      : "No preventatives recorded";

  const trendingVitals = buildTrendingVitals(bundle);
  const vitalsHtml =
    trendingVitals.length > 0
      ? `<div class="section-label">TRENDING VITALS</div>
      <div class="grid-2">${trendingVitals
        .map(
          (v) =>
            `<div class="mini-card"><div class="field-label">${escapeHtml(v.label)}</div><div style="font-weight:700;">${escapeHtml(v.value)}</div><div style="font-size:9px;color:#5a6b75;margin-top:4px;">${escapeHtml(v.trend)}</div></div>`
        )
        .join("")}</div>`
      : "";

  const labMarkers = buildLabMarkerRows(bundle.labResults);
  const abnormalNote = buildAbnormalLabNote(labMarkers);
  const labsHtml =
    labMarkers.length > 0
      ? `<div class="section-label">TRENDING LAB MARKERS</div>
      <div class="grid-2">${labMarkers
        .map(
          (m) =>
            `<div class="mini-card"><div class="field-label">${escapeHtml(m.name)}</div><div style="font-weight:700;">${escapeHtml(m.value)} ${escapeHtml(m.unit)}</div></div>`
        )
        .join("")}</div>
      ${abnormalNote ? `<div style="font-size:9px;color:#5a6b75;margin-top:6px;">${escapeHtml(abnormalNote)}</div>` : ""}`
      : "";

  const vacSection =
    vaccines.length > 0
      ? `<div class="section-label">VACCINATION HISTORY</div>
      <table><thead><tr><th>Vaccine</th><th>Date</th><th>Next due</th><th>Clinic</th>${showBatchCol ? "<th>Batch</th>" : ""}</tr></thead><tbody>${vacTable}</tbody></table>${titerFootnote}`
      : "";

  const narratives = buildCaseNarratives(bundle);
  const narrativeHtml =
    narratives.length > 0
      ? `<div class="section-label">ACTIVE CASE NARRATIVES</div>
      ${narratives
        .map(
          (n) =>
            `<div class="card" style="font-size:10px;line-height:1.5;margin-bottom:8px;">
        <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(n.title)}</div>
        ${escapeHtml(n.body.slice(0, 600))}
        <div style="font-size:9px;color:#5a6b75;margin-top:6px;">Sources: ${escapeHtml(n.sources)}</div>
      </div>`
        )
        .join("")}`
      : "";

  const timelineEvents = buildMedicalTimeline(bundle);
  const timelineHtml =
    timelineEvents.length > 0
      ? `<div class="section-label">MEDICAL TIMELINE</div>
      ${timelineEvents
        .map(
          (e) =>
            `<div class="card" style="margin-bottom:6px;">
        <div style="font-weight:700;font-size:11px;">${escapeHtml(e.dateLabel)}</div>
        <div style="font-size:10px;font-weight:600;">${escapeHtml(e.title)}</div>
        <div style="font-size:10px;color:#5a6b75;">${escapeHtml(e.subtitle)}</div>
      </div>`
        )
        .join("")}`
      : "";

  const recentObs = filterRecentJournalObservations(bundle);
  const obsHtml =
    recentObs.length > 0
      ? `<div class="section-label">PARENT-REPORTED OBSERVATIONS (90 days)</div>
      <table><thead><tr><th>Date</th><th>Observation</th><th>Domain</th></tr></thead><tbody>${recentObs
        .map(
          (j) =>
            `<tr>
      <td>${escapeHtml(j.entry_date)}</td>
      <td>${escapeHtml((j.note ?? j.subtype ?? "Observation").slice(0, 120))}</td>
      <td>${escapeHtml(j.domain)}</td>
    </tr>`
        )
        .join("")}</tbody></table>`
      : "";

  const workupLabs = buildWorkupLabRows(bundle.labResults);
  const workupHtml =
    workupLabs.length > 0
      ? `<div class="section-label">ACTIVE WORKUP LABS</div>
      <table><thead><tr><th>Panel</th><th>Test</th><th>Result</th><th>Ref</th></tr></thead><tbody>${workupLabs
        .map(
          (w) =>
            `<tr><td>${escapeHtml(w.panel)}</td><td>${escapeHtml(w.testName)}</td><td>${escapeHtml(w.value)}</td><td>${escapeHtml(w.referenceRange)}</td></tr>`
        )
        .join("")}</tbody></table>`
      : "";

  const insurance = parseInsuranceDoc(bundle.vaultDocuments);
  const insuranceHtml = insurance
    ? `<div class="section-label">INSURANCE ON FILE</div>
    <div class="card">
      <div style="font-weight:700;">${escapeHtml(insurance.carrier)}</div>
      <div style="font-size:10px;margin-top:6px;">Policy: ${escapeHtml(insurance.policy)} · ${escapeHtml(insurance.coverage)}</div>
      ${insurance.deductible ? `<div style="font-size:10px;margin-top:4px;">Deductible: ${escapeHtml(insurance.deductible)}</div>` : ""}
      ${insurance.reimbursement ? `<div style="font-size:10px;margin-top:4px;">Reimbursement: ${escapeHtml(insurance.reimbursement)}</div>` : ""}
      ${insurance.waitingPeriod ? `<div style="font-size:10px;margin-top:4px;">Waiting period: ${escapeHtml(insurance.waitingPeriod)}</div>` : ""}
    </div>`
    : "";

  const baseline = bundle.behaviorBaseline;
  const behaviorHtml = baseline
    ? `<div class="section-label">BEHAVIORAL PROFILE</div>
    <div class="card" style="font-size:10px;line-height:1.5;">
      <div><strong>Social:</strong> ${escapeHtml(baseline.social_disposition)}</div>
      <div style="margin-top:4px;"><strong>Food motivation:</strong> ${escapeHtml(baseline.food_motivation)}</div>
      <div style="margin-top:4px;"><strong>Vocalization:</strong> ${escapeHtml(baseline.vocalization_level)}</div>
      ${baseline.energy_notes ? `<div style="margin-top:4px;"><strong>Energy:</strong> ${escapeHtml(baseline.energy_notes)}</div>` : ""}
      ${(baseline.stress_triggers ?? []).length ? `<div style="margin-top:4px;"><strong>Stress triggers:</strong> ${escapeHtml(baseline.stress_triggers.join(", "))}</div>` : ""}
      ${baseline.sleep_safe_spot ? `<div style="margin-top:4px;"><strong>Safe spot:</strong> ${escapeHtml(baseline.sleep_safe_spot)}</div>` : ""}
    </div>`
    : "";

  const sourceRows = buildSourceDocumentRows(
    bundle.vaccinations,
    bundle.vaultDocuments,
    titer ? { lab: titer.lab, date: titer.date } : null
  );
  const appendixHtml =
    sourceRows.length > 0
      ? `<div class="section-label">APPENDIX — SOURCE DOCUMENTS</div>
      <div>${sourceRows
        .slice(0, 10)
        .map(
          (s) =>
            `<span class="pill">${escapeHtml(s.clinic)} · ${escapeHtml(s.summary)} ${s.verified ? "✓" : ""}</span>`
        )
        .join("")}</div>`
      : "";

  const verifyBlock = `<div class="banner-teal" style="margin-top:14px;display:flex;gap:14px;align-items:center;">
    ${qrDataUri ? `<img src="${qrDataUri}" width="100" height="100" />` : ""}
    <div>
      <div style="font-weight:700;font-size:12px;">VERIFY SOURCE RECORDS</div>
      <div style="font-size:11px;margin-top:6px;color:#2d4a6f;">${escapeHtml(verifyUrl)}</div>
      <div style="font-size:9px;margin-top:6px;">Valid 14 days from generation. Record-based summary — not a substitute for clinical judgment.</div>
    </div>
  </div>`;

  const page1Body = `
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
        <div style="font-weight:700;font-size:11px;">CLINICAL SUMMARY</div>
        <span style="font-size:10px;color:#5a6b75;">Record-based summary</span>
      </div>
      <div style="font-size:10px;line-height:1.55;">${escapeHtml(clinical.narrative)}</div>
    </div>
    <div class="section-label">ACTIVE CLINICAL PICTURE <span style="font-weight:500;color:#6b7280;">at-a-glance</span></div>
    <div class="grid-4">
      <div class="mini-card"><div class="field-label">CURRENT MEDICATIONS</div>${medCard}</div>
      <div class="mini-card"><div class="field-label">ALLERGIES</div>${allergyCard}</div>
      <div class="mini-card"><div class="field-label">CHRONIC &amp; PRE-EXISTING</div>${chronicCard}</div>
      <div class="mini-card"><div class="field-label">PREVENTATIVES</div>${preventCard}</div>
    </div>`;

  const rawPages: ExportPage[] = [
    {
      sections: [section("overview", page1Body, false)],
    },
    {
      sections: [
        section("vitals", vitalsHtml, trendingVitals.length === 0),
        section("labs", labsHtml, labMarkers.length === 0),
        section("vaccines", vacSection, vaccines.length === 0),
      ],
    },
    {
      sections: [
        section("narratives", narrativeHtml, narratives.length === 0),
        section("timeline", timelineHtml, timelineEvents.length === 0),
        section("workup", workupHtml, workupLabs.length === 0),
        section("observations", obsHtml, recentObs.length === 0),
      ],
    },
    {
      sections: [
        section("insurance", insuranceHtml, !insurance),
        section("behavior", behaviorHtml, !baseline),
        section("appendix", appendixHtml, sourceRows.length === 0),
        section("verify", verifyBlock, false),
      ],
    },
  ];

  const pages = compactPages(rawPages, [0]);
  const total = pages.length;

  const body = renderExportPages(pages, (pageNum, pageTotal, content) => {
    const isFirst = pageNum === 1;
    const isLast = pageNum === pageTotal;
    const metaExtra = isFirst
      ? `Generated ${escapeHtml(generatedLong)}<br/><span class="fresh">${escapeHtml(freshness)}</span><br/>Verify: ${escapeHtml(verifyUrl)}`
      : "";
    const header = isFirst
      ? `<div class="header-row">
        <div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">VETERINARY SUMMARY</div></div>
        <div class="page-meta">${padPageNum(pageNum)} / ${padPageNum(pageTotal)}<br/>${metaExtra}</div>
      </div>`
      : vetHeader(petSubtitle, pageNum, pageTotal);
    const footer = isFirst
      ? `${escapeHtml(headerName)} · ${escapeHtml(bundle.petEmail)} · Page ${pageNum} of ${pageTotal} · Generated ${escapeHtml(generated)} · Source records: ${escapeHtml(verifyUrl)}`
      : isLast
        ? `${escapeHtml(headerName)} · ${escapeHtml(bundle.petEmail)} · Page ${pageNum} of ${pageTotal} · Generated ${escapeHtml(generated)}`
        : `${escapeHtml(bundle.petEmail)} · Page ${pageNum} of ${pageTotal}`;

    return `<div class="page">
    ${watermarkHtml()}
    <div class="content">
      ${header}
      ${isFirst ? content : `<div style="margin-bottom:8px;"></div>${content}`}
    </div>
    <div class="footer">${footer}</div>
  </div>`;
  });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${HEALTH_EXPORT_CSS}
    .pet-strip { background:#e8f4fc; border-radius:10px; padding:12px; margin-bottom:12px; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .grid-4 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .mini-card { background:#fff; border:1px solid #e5eaee; border-radius:8px; padding:10px; min-height:72px; }
    .fresh { background:#26c1c1; color:#fff; font-size:9px; font-weight:700; padding:4px 10px; border-radius:10px; display:inline-block; }
  </style></head><body>${body}</body></html>`;
}
