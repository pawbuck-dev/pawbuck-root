import type { Tables } from "@/database.types";

export type InvoiceExtractedFacts = {
  title?: string;
  summary?: string;
  primaryDate?: string | null;
  keyFacts?: { label: string; value: string }[];
};

const TOTAL_LABELS = /^(total|amount|balance|charges|subtotal|invoice total|amount due|grand total)$/i;
const COVERED_LABELS = /insurance|covered|plan|paid by|reimbursed|adjustment/i;
const DATE_LABELS = /^(invoice date|service date|date of service|statement date)$/i;
const PROVIDER_LABELS = /provider|clinic|vendor|location|practice|hospital|pharmacy/i;

export function firstCurrencyInText(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/\$[\d,]+(?:\.\d{1,2})?/);
  if (!m) return null;
  const n = Number.parseFloat(m[0].replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseKeyFacts(raw: unknown): { label: string; value: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const r = x as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label : "";
      const value = typeof r.value === "string" ? r.value : "";
      return { label, value };
    })
    .filter(Boolean) as { label: string; value: string }[];
}

function hasFlexibleShape(o: Record<string, unknown>): boolean {
  if (typeof o.title === "string" && o.title.trim()) return true;
  if (typeof o.summary === "string" && o.summary.trim()) return true;
  if (typeof o.primaryDate === "string" && o.primaryDate.trim()) return true;
  const facts = parseKeyFacts(o.keyFacts);
  return facts.length > 0;
}

/** Map legacy medical-record extraction JSON into flexible invoice facts. */
function medicalRecordToInvoiceFacts(o: Record<string, unknown>): InvoiceExtractedFacts {
  const keyFacts: { label: string; value: string }[] = [];
  const clinicName = typeof o.clinicName === "string" ? o.clinicName.trim() : "";
  const dateOfVisit = typeof o.dateOfVisit === "string" ? o.dateOfVisit.trim() : null;
  const petName = typeof o.petName === "string" ? o.petName.trim() : "";

  if (clinicName) keyFacts.push({ label: "Provider", value: clinicName });
  if (petName) keyFacts.push({ label: "Pet", value: petName });

  for (const field of ["total", "totalAmount", "invoiceTotal", "amountDue"] as const) {
    const raw = o[field];
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      keyFacts.push({ label: "Total", value: `$${raw.toFixed(2)}` });
      break;
    }
    if (typeof raw === "string") {
      const v = firstCurrencyInText(raw) ?? (Number.isFinite(Number.parseFloat(raw)) ? Number.parseFloat(raw) : null);
      if (v != null && v > 0) {
        keyFacts.push({ label: "Total", value: `$${v.toFixed(2)}` });
        break;
      }
    }
  }

  const items = Array.isArray(o.items) ? o.items : [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;

    const amountRaw = r.amount ?? r.price ?? r.total ?? r.cost;
    if (typeof amountRaw === "number" && Number.isFinite(amountRaw)) {
      keyFacts.push({ label: name, value: `$${amountRaw.toFixed(2)}` });
      continue;
    }
    if (typeof amountRaw === "string") {
      const v = firstCurrencyInText(amountRaw);
      if (v != null) {
        keyFacts.push({ label: name, value: `$${v.toFixed(2)}` });
        continue;
      }
    }

    const fromName = firstCurrencyInText(name);
    if (fromName != null) {
      keyFacts.push({ label: name.replace(/\$[\d,]+(?:\.\d{1,2})?/g, "").trim() || name, value: `$${fromName.toFixed(2)}` });
    }
  }

  const title = clinicName ? `${clinicName} invoice` : "Invoice";
  const summary =
    items.length > 0
      ? `Billing document with ${items.length} line item${items.length === 1 ? "" : "s"}.`
      : "Billing document";

  return {
    title,
    summary,
    primaryDate: dateOfVisit,
    keyFacts,
  };
}

/** Normalize pet_documents.extracted_json for invoice display and totals. */
export function parseInvoiceExtracted(
  json: Tables<"pet_documents">["extracted_json"]
): InvoiceExtractedFacts {
  if (json === null || typeof json !== "object") return {};
  const o = json as Record<string, unknown>;

  if (hasFlexibleShape(o)) {
    return {
      title: typeof o.title === "string" ? o.title : undefined,
      summary: typeof o.summary === "string" ? o.summary : undefined,
      primaryDate: typeof o.primaryDate === "string" ? o.primaryDate : null,
      keyFacts: parseKeyFacts(o.keyFacts),
    };
  }

  return medicalRecordToInvoiceFacts(o);
}

export function parseInvoiceRowTotal(ex: InvoiceExtractedFacts): number | null {
  for (const kf of ex.keyFacts ?? []) {
    if (TOTAL_LABELS.test(kf.label.trim())) {
      const v = firstCurrencyInText(kf.value);
      if (v != null) return v;
    }
  }

  let lineSum = 0;
  let lineCount = 0;
  for (const kf of ex.keyFacts ?? []) {
    if (TOTAL_LABELS.test(kf.label.trim()) || COVERED_LABELS.test(kf.label)) continue;
    if (PROVIDER_LABELS.test(kf.label) || DATE_LABELS.test(kf.label)) continue;
    if (/^pet$/i.test(kf.label.trim())) continue;
    const v = firstCurrencyInText(kf.value);
    if (v != null && v > 0) {
      lineSum += v;
      lineCount += 1;
    }
  }
  if (lineCount > 0 && lineSum > 0) return lineSum;

  const blob = `${ex.title ?? ""} ${ex.summary ?? ""}`;
  return firstCurrencyInText(blob);
}

export function parseInvoiceRowCovered(ex: InvoiceExtractedFacts): number | null {
  let sum = 0;
  let any = false;
  for (const kf of ex.keyFacts ?? []) {
    if (COVERED_LABELS.test(kf.label)) {
      const v = firstCurrencyInText(kf.value);
      if (v != null) {
        sum += v;
        any = true;
      }
    }
  }
  return any ? sum : null;
}

export function invoiceProviderLine(ex: InvoiceExtractedFacts): string {
  return (
    ex.keyFacts?.find((k) => PROVIDER_LABELS.test(k.label))?.value?.trim() ?? ""
  );
}

/** Prefer service/invoice date from extraction; fall back to upload time. */
export function effectiveInvoiceDate(
  row: Tables<"pet_documents">,
  ex: InvoiceExtractedFacts
): Date | null {
  if (ex.primaryDate) {
    const d = new Date(ex.primaryDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  for (const kf of ex.keyFacts ?? []) {
    if (DATE_LABELS.test(kf.label.trim())) {
      const d = new Date(kf.value.trim());
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  const u = new Date(row.created_at);
  return Number.isNaN(u.getTime()) ? null : u;
}

export function formatInvoiceUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatInvoiceShortDate(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.trim();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatInvoiceDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return formatInvoiceShortDate(`${y}-${m}-${day}`);
}

export function aggregateInvoiceBilling(rows: Tables<"pet_documents">[]) {
  let total = 0;
  let covered = 0;
  let coveredKnown = false;
  for (const row of rows) {
    const ex = parseInvoiceExtracted(row.extracted_json);
    const t = parseInvoiceRowTotal(ex);
    if (t != null) total += t;
    const c = parseInvoiceRowCovered(ex);
    if (c != null) {
      covered += c;
      coveredKnown = true;
    }
  }
  const pct =
    total > 0 && coveredKnown ? Math.min(100, Math.round((covered / total) * 100)) : 0;
  return { total, covered, coveredKnown, pct };
}
