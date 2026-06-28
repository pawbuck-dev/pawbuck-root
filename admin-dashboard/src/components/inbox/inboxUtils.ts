export type InboxTab = "needs-action" | "stuck" | "history";

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfUtcDayYmd(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return toYmd(d);
}

/** `to` query is exclusive upper bound (matches API `completed_at < @to`). */
export function exclusiveEndIsoFromYmd(ymd: string): string {
  const [y, m, day] = ymd.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1, day + 1));
  return d.toISOString();
}

export function formatShortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

export function parseInboxTab(raw: string | null): InboxTab {
  if (raw === "stuck" || raw === "history") return raw;
  return "needs-action";
}

export function ownerVisibilityLabel(row: {
  status: string;
  success: boolean | null;
  failureReason: string | null;
  reviewStatus: string | null;
}): { label: string; tone: "visible" | "hidden" | "stuck" } {
  if (row.status === "processing") {
    return { label: "Stuck", tone: "stuck" };
  }
  const review = row.reviewStatus ?? "";
  if (review === "dismissed" || review === "resolved") {
    return { label: "Hidden", tone: "hidden" };
  }
  if (row.success === false || (row.failureReason?.trim()?.length ?? 0) > 0) {
    return { label: "Owner sees error", tone: "visible" };
  }
  return { label: "Hidden", tone: "hidden" };
}

export function problemSummary(row: {
  failureReasonSnippet: string | null;
  failureReason: string | null;
  subject: string | null;
  status: string;
}): string {
  if (row.status === "processing") return "Processing lock — owner Confirm may fail";
  const snippet = row.failureReasonSnippet?.trim() || row.failureReason?.trim();
  if (snippet) return snippet.length > 120 ? `${snippet.slice(0, 120)}…` : snippet;
  return row.subject?.trim() || "No problem summary";
}
