import type { HealthExportBundle } from "@/services/healthExportBundle";
import {
  escapeHtml,
  HEALTH_EXPORT_CSS,
  watermarkHtml,
} from "@/services/healthExportPdfCommon";
import { petPassportVerifyPath } from "@/constants/healthExportUrls";
import {
  buildComplianceBanner,
  buildHandlingNarrative,
  buildHandlingTags,
  buildJurisdictionRows,
  buildLatestVaccineRows,
  buildSourceDocumentRows,
  formatAgeDisplay,
  formatExportDate,
  formatSexNeutered,
  formatWeightDisplay,
  maskMicrochip,
  maskPassportNumber,
  maskPhone,
} from "@/utils/healthExportFormatters";
import { parseEuPassportMeta, parseTravelAndTiterDocs } from "@/utils/healthExportDerived";

type TemplateInput = {
  bundle: HealthExportBundle;
  petPhotoDataUri: string | null;
  qrDataUri: string | null;
};

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

export function buildPetPassportHtml(input: TemplateInput): string {
  const { bundle, petPhotoDataUri, qrDataUri } = input;
  const { pet, owner, primaryVet } = bundle;
  const issued = formatExportDate(bundle.generatedAt);
  const { titer, travelCerts } = parseTravelAndTiterDocs(
    bundle.vaultDocuments,
    bundle.labResults
  );
  const hasEuPassport = Boolean(pet.passport_number?.trim());
  const compliance = buildComplianceBanner(pet, bundle.vaccinations, {
    hasTiter: Boolean(titer),
  });
  const vaccines = buildLatestVaccineRows(bundle.vaccinations);
  const jurisdictions = buildJurisdictionRows(pet, bundle.vaccinations, {
    hasTiter: Boolean(titer),
    hasEuPassport,
  });
  const sources = buildSourceDocumentRows(
    bundle.vaccinations,
    bundle.vaultDocuments,
    titer ? { lab: titer.lab, date: titer.date } : null
  );
  const handlingTags = buildHandlingTags(bundle.allergies, bundle.behaviorBaseline);
  const handlingText = buildHandlingNarrative(pet.name, bundle.allergies, bundle.behaviorBaseline);
  const verifyUrl = petPassportVerifyPath(pet.email_id ?? pet.name);
  const passportMasked = maskPassportNumber(pet.passport_number);
  const euMeta = parseEuPassportMeta(pet, bundle.vaultDocuments);

  const photoBlock = petPhotoDataUri
    ? `<img src="${petPhotoDataUri}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;" />`
    : `<div style="width:120px;height:120px;border-radius:10px;background:#e8f7f6;display:flex;align-items:center;justify-content:center;font-size:40px;">🐾</div>`;

  const tagHtml = handlingTags
    .map((t) => {
      const cls = t.variant === "warning" ? "pill pill-warn" : t.variant === "info" ? "pill pill-info" : "pill";
      return `<span class="${cls}">${escapeHtml(t.label)}</span>`;
    })
    .join("");

  const vaccineRows =
    vaccines
      .map(
        (v) => `
    <div class="card" style="margin-bottom:8px;">
      <div style="font-weight:700;font-size:12px;">${escapeHtml(v.name)}</div>
      <div style="font-size:10px;color:#5a6b75;margin-top:4px;">Administered ${escapeHtml(v.administered)} · Valid through ${escapeHtml(v.validThrough)}</div>
    </div>`
      )
      .join("") ||
    `<div class="card"><span style="color:#6b7280;">No vaccinations recorded</span></div>`;

  const travelBlock =
    titer || travelCerts.length > 0
      ? `<div class="section-label">TRAVEL CERTIFICATES</div>
      ${
        titer
          ? `<div class="card" style="margin-bottom:8px;">
        <div style="font-weight:700;font-size:11px;">RABIES NEUTRALIZING ANTIBODY TITER</div>
        <table style="margin-top:6px;font-size:10px;">
          <tr><td>Result</td><td>${escapeHtml(titer.result)}${titer.meetsEuThreshold ? " ✓ Pass" : ""}</td></tr>
          <tr><td>Lab</td><td>${escapeHtml(titer.lab)}</td></tr>
          <tr><td>Date</td><td>${escapeHtml(titer.date)}</td></tr>
          <tr><td>Valid for</td><td>${titer.meetsEuThreshold ? "EU, UK entry" : "Review with veterinarian"}</td></tr>
        </table>
      </div>`
          : ""
      }
      ${travelCerts
        .map(
          (c) =>
            `<div class="card" style="margin-bottom:8px;font-size:10px;"><strong>${escapeHtml(c.title)}</strong><div style="color:#5a6b75;margin-top:4px;">${escapeHtml(c.summary)} · ${escapeHtml(c.date)}</div></div>`
        )
        .join("")}`
      : "";

  const euPassportBlock = passportMasked
    ? `
    <div class="card">
      <div class="section-label" style="margin-top:0;">EU PET PASSPORT REFERENCE</div>
      <table>
        ${euMeta.issuedBy ? `<tr><td>Issued by</td><td>${escapeHtml(euMeta.issuedBy)}</td></tr>` : ""}
        ${euMeta.country ? `<tr><td>Country</td><td>${escapeHtml(euMeta.country)}</td></tr>` : ""}
        <tr><td>Passport #</td><td>${escapeHtml(passportMasked)}</td></tr>
        <tr><td>Status</td><td>On file</td></tr>
      </table>
    </div>`
    : "";

  const jurisdictionRows = jurisdictions
    .map(
      (j) => `
    <tr>
      <td>${escapeHtml(j.jurisdiction)}</td>
      <td>${escapeHtml(j.status)}</td>
      <td>${escapeHtml(j.notes)}</td>
    </tr>`
    )
    .join("");

  const sourceRows =
    sources
      .map(
        (s) => `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:700;font-size:11px;">${escapeHtml(s.clinic)}</div>
        <div style="font-size:10px;color:#5a6b75;">${escapeHtml(s.summary)} · ${escapeHtml(s.date)}</div>
      </div>
      <span style="color:#28a745;font-weight:700;font-size:10px;">${s.verified ? "✓ Verified" : "On file"}</span>
    </div>`
      )
      .join("") || `<div class="card">No source documents indexed yet</div>`;

  const ageShort = formatAgeDisplay(pet.date_of_birth).replace(" years", "y").replace(" year", "y");
  const totalPages = 3;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${HEALTH_EXPORT_CSS}
    .pet-grid { display:flex; gap:16px; margin-bottom:12px; }
    .pet-name { font-size:28px; font-weight:800; color:#26c1c1; margin-bottom:8px; }
    .field-label { font-size:8px; color:#6b7280; text-transform:uppercase; letter-spacing:1px; }
    .field-value { font-size:13px; font-weight:600; margin-top:2px; }
    .two-col { display:flex; gap:10px; }
    .two-col > div { flex:1; }
  </style></head><body>
  <div class="page">
    ${watermarkHtml()}
    <div class="content">
      <div class="header-row">
        <div>
          <div class="brand-title">🐾 PAWBUCK</div>
          <div class="brand-sub">PET HEALTH PASSPORT</div>
        </div>
        <div class="page-meta">
          ${padPageNum(1)} / ${padPageNum(totalPages)}<br/>
          <span class="verified">✓ VERIFIED</span>
        </div>
      </div>
      <div class="pet-grid">
        ${photoBlock}
        <div style="flex:1;">
          <div class="field-label">PET NAME</div>
          <div class="pet-name">${escapeHtml(pet.name)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div><div class="field-label">BREED</div><div class="field-value">${escapeHtml(pet.breed)}</div></div>
            <div><div class="field-label">AGE</div><div class="field-value">${escapeHtml(formatAgeDisplay(pet.date_of_birth))}</div></div>
            <div><div class="field-label">SEX</div><div class="field-value">${escapeHtml(formatSexNeutered(pet.sex))}</div></div>
            <div><div class="field-label">WEIGHT</div><div class="field-value">${escapeHtml(formatWeightDisplay(pet.weight_value, pet.weight_unit))}</div></div>
            <div><div class="field-label">COLOR</div><div class="field-value">${escapeHtml(pet.color?.trim() || "—")}</div></div>
            <div><div class="field-label">MICROCHIP</div><div class="field-value">${escapeHtml(maskMicrochip(pet.microchip_number))}</div></div>
          </div>
        </div>
      </div>
      ${
        compliance
          ? `<div class="banner-teal"><div style="font-weight:700;font-size:12px;">✓ ${escapeHtml(compliance.headline)}</div><div style="font-size:10px;margin-top:4px;color:#2d4a6f;">${escapeHtml(compliance.subline)}</div></div>`
          : ""
      }
      <div class="section-label">OWNER &amp; PRIMARY VET</div>
      <div class="two-col">
        <div class="card">
          <div style="font-weight:700;font-size:11px;margin-bottom:6px;">PRIMARY OWNER</div>
          <div class="field-label">Name</div><div class="field-value">${escapeHtml(owner.name)}</div>
          <div class="field-label" style="margin-top:6px;">Phone</div><div class="field-value">${escapeHtml(maskPhone(owner.phone))}</div>
          <div class="field-label" style="margin-top:6px;">Email</div><div class="field-value">${escapeHtml(owner.email)}</div>
          <div class="field-label" style="margin-top:6px;">Address</div><div class="field-value">${escapeHtml(owner.address)}</div>
        </div>
        <div class="card">
          <div style="font-weight:700;font-size:11px;margin-bottom:6px;">PRIMARY VET</div>
          ${
            primaryVet
              ? `
          <div class="field-label">Clinic</div><div class="field-value">${escapeHtml(primaryVet.clinicName)}</div>
          <div class="field-label" style="margin-top:6px;">Veterinarian</div><div class="field-value">${escapeHtml(primaryVet.veterinarian)}</div>
          <div class="field-label" style="margin-top:6px;">Phone</div><div class="field-value">${escapeHtml(maskPhone(primaryVet.phone))}</div>
          <div class="field-label" style="margin-top:6px;">Pet Email</div><div class="field-value">${escapeHtml(bundle.petEmail)}</div>`
              : `<div style="font-size:10px;color:#6b7280;">Add a veterinarian to your care team in PawBuck.</div>`
          }
        </div>
      </div>
      <div class="section-label">HANDLING NOTES</div>
      <div style="font-size:9px;color:#5a6b75;margin-bottom:6px;">FOR SITTERS, WALKERS, BOARDING &amp; NEW HANDLERS</div>
      <div style="margin-bottom:8px;">${tagHtml}</div>
      <div class="card" style="font-size:10px;line-height:1.5;">${escapeHtml(handlingText)}</div>
    </div>
    <div class="footer">${escapeHtml(bundle.petEmail)} · Issued ${escapeHtml(issued)} · Scan QR on final page</div>
  </div>

  <div class="page">
    ${watermarkHtml()}
    <div class="content">
      <div class="header-row">
        <div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">PET HEALTH PASSPORT</div></div>
        <div class="page-meta">${padPageNum(2)} / ${padPageNum(totalPages)}</div>
      </div>
      <div style="font-weight:700;margin-bottom:10px;">${escapeHtml(pet.name)} · ${escapeHtml(pet.breed)} · ${escapeHtml(ageShort)}</div>
      <div class="section-label">VACCINATION STATUS</div>
      ${vaccineRows}
      ${travelBlock}
      ${euPassportBlock}
      <div class="section-label">JURISDICTION COMPLIANCE</div>
      <table class="card" style="padding:0;">
        <thead><tr><th>Jurisdiction</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>${jurisdictionRows}</tbody>
      </table>
    </div>
    <div class="footer">${escapeHtml(bundle.petEmail)} · Vaccination records verified against source certificates from licensed clinics</div>
  </div>

  <div class="page">
    ${watermarkHtml()}
    <div class="content">
      <div class="header-row">
        <div><div class="brand-title">🐾 PAWBUCK</div><div class="brand-sub">PET HEALTH PASSPORT</div></div>
        <div class="page-meta">${padPageNum(3)} / ${padPageNum(totalPages)}</div>
      </div>
      <div class="section-label">SOURCE DOCUMENTS ON FILE</div>
      ${sourceRows}
      <div class="banner-teal" style="margin-top:14px;display:flex;gap:14px;align-items:center;">
        ${qrDataUri ? `<img src="${qrDataUri}" width="100" height="100" />` : ""}
        <div>
          <div style="font-weight:700;font-size:12px;">VERIFY &amp; LIVE UPDATES</div>
          <div style="font-size:11px;margin-top:6px;color:#2d4a6f;">${escapeHtml(verifyUrl)}</div>
          <div style="font-size:9px;margin-top:6px;">Scan to verify the latest vaccination status and emergency contacts.</div>
        </div>
      </div>
      <div style="font-size:8px;color:#6b7280;margin-top:12px;line-height:1.4;">
        Document generated through PawBuck. Based on information provided by pet owner. Original documents maintained by owner.
        This passport is a health summary; it does not replace official government-issued travel certificates where required.
      </div>
    </div>
    <div class="footer">Document Generated Through PawBuck</div>
  </div>
  </body></html>`;
}
