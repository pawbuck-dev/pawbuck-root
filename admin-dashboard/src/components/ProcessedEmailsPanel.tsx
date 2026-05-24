import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type {
  SupportProcessedEmailAttachment,
  SupportProcessedEmailDetail,
  SupportProcessedEmailListItem,
  SupportProcessedEmailsSummaryResponse,
} from "@/types/support";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  client: ReturnType<typeof createSupportClient>;
};

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDayYmd(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return toYmd(d);
}

/** `to` query is exclusive upper bound (matches API `completed_at < @to`). */
function exclusiveEndIsoFromYmd(ymd: string): string {
  const [y, m, day] = ymd.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1, day + 1));
  return d.toISOString();
}

function formatShortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type ListViewMode = "reviewInbox" | "failuresOnly" | "all";

export function ProcessedEmailsPanel({ client }: Props) {
  const [dateFrom, setDateFrom] = useState(() => startOfUtcDayYmd(30));
  const [dateTo, setDateTo] = useState(() => toYmd(new Date()));
  const [documentType, setDocumentType] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [q, setQ] = useState("");
  const [listViewMode, setListViewMode] = useState<ListViewMode>("reviewInbox");
  const [ownerEmailFilter, setOwnerEmailFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [list, setList] = useState<SupportProcessedEmailListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SupportProcessedEmailsSummaryResponse | null>(null);

  const [selected, setSelected] = useState<SupportProcessedEmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attachments, setAttachments] = useState<SupportProcessedEmailAttachment[]>([]);
  const [attachMeta, setAttachMeta] = useState<{ code: string | null; message: string | null }>({
    code: null,
    message: null,
  });
  const [attachWarning, setAttachWarning] = useState<string | null>(null);
  const [openBusy, setOpenBusy] = useState<number | null>(null);
  const [bulkClearOwnerEmail, setBulkClearOwnerEmail] = useState("");
  const [bulkClearMessage, setBulkClearMessage] = useState<string | null>(null);
  const [bulkClearBusy, setBulkClearBusy] = useState(false);
  const [reprocessDocType, setReprocessDocType] =
    useState<"vaccinations" | "medications" | "lab_results" | "clinical_exams">("vaccinations");
  const [includeDismissed, setIncludeDismissed] = useState(true);

  const fromIso = useMemo(() => `${dateFrom}T00:00:00.000Z`, [dateFrom]);
  const toIso = useMemo(() => exclusiveEndIsoFromYmd(dateTo), [dateTo]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await client.listProcessedEmails({
        page,
        pageSize,
        from: fromIso,
        to: toIso,
        documentType: documentType.trim() || "all",
        reviewStatus: reviewStatus.trim() || "all",
        q: q.trim() || undefined,
        reviewInboxOnly: listViewMode === "reviewInbox",
        failuresOnly: listViewMode === "failuresOnly",
        ownerEmail: ownerEmailFilter.trim() || undefined,
      });
      setList(res.items);
      setTotalCount(res.totalCount);
    } catch (e) {
      setList([]);
      setTotalCount(0);
      setListError(e instanceof SupportApiError ? e.message : "Failed to load processed emails");
    } finally {
      setListLoading(false);
    }
  }, [client, page, pageSize, fromIso, toIso, documentType, reviewStatus, q, listViewMode, ownerEmailFilter]);

  const loadSummary = useCallback(async () => {
    try {
      const s = await client.getProcessedEmailsSummary(fromIso, toIso);
      setSummary(s);
    } catch {
      setSummary(null);
    }
  }, [client, fromIso, toIso]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const applyPreset = (days: number) => {
    setDateTo(toYmd(new Date()));
    setDateFrom(startOfUtcDayYmd(days));
    setPage(1);
  };

  const openRow = async (row: SupportProcessedEmailListItem) => {
    setDetailLoading(true);
    setDetailError(null);
    setAttachments([]);
    setAttachMeta({ code: null, message: null });
    setAttachWarning(null);
    setSelected(null);
    try {
      const [detail, att] = await Promise.all([
        client.getProcessedEmail(row.id),
        client.listProcessedEmailAttachments(row.id),
      ]);
      setSelected(detail);
      setAttachments(att.attachments ?? []);
      setAttachMeta({ code: att.errorCode ?? null, message: att.errorMessage ?? null });
      setAttachWarning(att.warningMessage ?? null);
    } catch (e) {
      setSelected(null);
      setDetailError(e instanceof SupportApiError ? e.message : "Failed to load detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const openAttachment = async (index: number) => {
    if (!selected) return;
    setOpenBusy(index);
    setDetailError(null);
    try {
      const r = await client.getProcessedEmailAttachmentSignedUrl(selected.id, index, 300);
      if (r.signedUrl) {
        window.open(r.signedUrl, "_blank", "noopener,noreferrer");
      } else if (r.errorCode === "ATTACHMENT_NOT_STORED") {
        setDetailError(
          r.errorMessage ??
            "Attachment not retained in storage (same as consumer Review Inbox when JSON was never stored).",
        );
      } else if (r.errorCode === "ATTACHMENT_BODY_NOT_ARCHIVED") {
        setDetailError(
          r.errorMessage ??
            "Attachment bytes were not kept in the pending-emails archive (e.g. metadata-only snapshot after size cap).",
        );
      } else {
        setDetailError(r.errorMessage ?? r.errorCode ?? "Could not open attachment");
      }
    } catch (e) {
      setDetailError(e instanceof SupportApiError ? e.message : "Open attachment failed");
    } finally {
      setOpenBusy(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const bulkActionFilters = useMemo(
    () => ({
      from: fromIso,
      to: toIso,
      ownerEmail: (bulkClearOwnerEmail.trim() || ownerEmailFilter.trim()) || undefined,
    }),
    [fromIso, toIso, bulkClearOwnerEmail, ownerEmailFilter],
  );

  const runBulkReprocess = async (dryRun: boolean, emailIds?: string[]) => {
    if (!dryRun) {
      const ok = window.confirm(
        "Reprocess matching emails via mailgun-process-pet-mail?\n\nThis extracts attachments and files health records, then marks rows resolved. Requires edge secrets (PAWBUCK_API_URL, MILO_INTERNAL_SERVICE_KEY) and stored email JSON in pending-emails.",
      );
      if (!ok) return;
    }
    setBulkClearBusy(true);
    setBulkClearMessage(null);
    try {
      const res = await client.bulkReprocessReviewInbox({
        dryRun,
        defaultDocType: reprocessDocType,
        includeDismissed,
        maxRows: emailIds?.length === 1 ? 1 : 10,
        ...bulkActionFilters,
        emailIds,
      });
      const detail =
        res.results?.length > 0
          ? ` · ${res.results.map((r) => `${r.status}: ${r.subject ?? r.emailId}`).join("; ")}`
          : "";
      setBulkClearMessage(`${res.message}${detail}`);
      if (!dryRun && res.succeededCount > 0) {
        await loadList();
        if (emailIds?.length === 1 && selected?.id === emailIds[0]) {
          await openRow(selected);
        }
      }
    } catch (e) {
      setBulkClearMessage(e instanceof SupportApiError ? e.message : "Bulk reprocess failed");
    } finally {
      setBulkClearBusy(false);
    }
  };

  const runBulkClear = async (action: "dismiss" | "resolve", dryRun: boolean, emailIds?: string[]) => {
    if (!dryRun) {
      const verb = action === "resolve" ? "Resolve" : "Dismiss";
      const detail =
        action === "resolve"
          ? "Marks matching rows as handled (clears failure_reason). Use when health data is already filed or the error is environmental."
          : "Removes matching rows from consumer Processing errors. Health records already saved are not deleted.";
      const ok = window.confirm(`${verb} ${emailIds?.length === 1 ? "this" : "all matching"} Review Inbox row(s)?\n\n${detail}`);
      if (!ok) return;
    }
    setBulkClearBusy(true);
    setBulkClearMessage(null);
    try {
      const res = await client.bulkClearReviewInbox({
        action,
        dryRun,
        ...bulkActionFilters,
        maxRows: 500,
        emailIds,
      });
      setBulkClearMessage(res.message);
      if (!dryRun && res.updatedCount > 0) {
        await loadList();
        if (emailIds?.length === 1 && selected?.id === emailIds[0]) {
          setSelected(null);
        }
      }
    } catch (e) {
      setBulkClearMessage(e instanceof SupportApiError ? e.message : "Bulk clear failed");
    } finally {
      setBulkClearBusy(false);
    }
  };

  return (
    <div className="layout layout--support">
      <section className="panel panel--flush" style={{ minWidth: 0 }}>
        <h2 className="panel__title">Inbound mail errors</h2>
        <p className="muted" style={{ maxWidth: "44rem" }}>
          Debug consumer <strong>Messages → Processing errors</strong> without SQL. Default view matches the app
          Review Inbox (includes legacy <code>success=true</code> + <code>failure_reason</code> rows and stuck{" "}
          <code>status=processing</code> locks).
        </p>

        {summary ? (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            <strong>{summary.totalReviewInboxCandidates ?? 0}</strong> consumer Review Inbox ·{" "}
            <strong>{summary.totalStuckProcessing ?? 0}</strong> stuck processing ·{" "}
            <strong>{summary.totalFailures}</strong> hard failures (
            <code>success=false</code>) · Top types:{" "}
            {summary.byDocumentType.slice(0, 6).map((b) => (
              <span key={b.documentType || "empty"} style={{ marginRight: "0.75rem" }}>
                {(b.documentType || "(none)").slice(0, 24)} ({b.count})
              </span>
            ))}
          </p>
        ) : null}

        <div className="directory__toolbar" style={{ flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
          <span className="muted" style={{ marginRight: "0.25rem" }}>
            Preset:
          </span>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => applyPreset(7)}>
            7d
          </button>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => applyPreset(30)}>
            30d
          </button>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => applyPreset(90)}>
            90d
          </button>
          <select
            className="directory__search"
            style={{ width: "auto" }}
            value={listViewMode}
            onChange={(e) => {
              setListViewMode(e.target.value as ListViewMode);
              setPage(1);
            }}
            aria-label="List view"
          >
            <option value="reviewInbox">View: Consumer Review Inbox</option>
            <option value="failuresOnly">View: success=false only</option>
            <option value="all">View: All completed</option>
          </select>
          <input
            className="directory__search"
            style={{ minWidth: "10rem", flex: "1 1 10rem" }}
            placeholder="Owner email filter"
            value={ownerEmailFilter}
            onChange={(e) => {
              setOwnerEmailFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Owner email filter"
          />
          <label className="muted" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            From
            <input
              type="date"
              className="directory__search"
              style={{ width: "auto" }}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="muted" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            To
            <input
              type="date"
              className="directory__search"
              style={{ width: "auto" }}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <input
            className="directory__search"
            style={{ minWidth: "8rem", flex: "1 1 8rem" }}
            placeholder="document_type (exact or all)"
            value={documentType}
            onChange={(e) => {
              setDocumentType(e.target.value);
              setPage(1);
            }}
            aria-label="Document type filter"
          />
          <select
            className="directory__search"
            style={{ width: "auto" }}
            value={reviewStatus}
            onChange={(e) => {
              setReviewStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Review status"
          >
            <option value="all">All review statuses</option>
            <option value="pending">pending</option>
            <option value="resolved">resolved</option>
            <option value="dismissed">dismissed</option>
          </select>
        </div>
        <div className="directory__toolbar" style={{ marginTop: "0.5rem" }}>
          <input
            className="directory__search"
            style={{ flex: 1, minWidth: "12rem" }}
            placeholder="Search failure_reason + subject…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Search failures"
          />
          <button type="button" className="btn btn-secondary" disabled={listLoading} onClick={() => void loadList()}>
            Refresh
          </button>
        </div>

        <div
          className="directory__toolbar"
          style={{ marginTop: "0.75rem", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}
        >
          <span className="muted" style={{ fontWeight: 600 }}>
            Reprocess &amp; file records
          </span>
          <select
            className="directory__search"
            style={{ width: "auto" }}
            value={reprocessDocType}
            onChange={(e) =>
              setReprocessDocType(
                e.target.value as "vaccinations" | "medications" | "lab_results" | "clinical_exams",
              )
            }
            aria-label="Default document type when row has none"
          >
            <option value="vaccinations">Default: Vaccine</option>
            <option value="medications">Default: Medication</option>
            <option value="lab_results">Default: Lab</option>
            <option value="clinical_exams">Default: Clinical visit</option>
          </select>
          <input
            className="directory__search"
            style={{ minWidth: "10rem", flex: "1 1 10rem" }}
            placeholder="Owner email (optional)"
            value={bulkClearOwnerEmail}
            onChange={(e) => setBulkClearOwnerEmail(e.target.value)}
            aria-label="Owner email filter"
          />
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={includeDismissed}
              onChange={(e) => setIncludeDismissed(e.target.checked)}
            />
            <span className="muted">Include dismissed</span>
          </label>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkReprocess(true)}
          >
            Preview reprocess
          </button>
          <button
            type="button"
            className="btn btn-primary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkReprocess(false)}
          >
            Reprocess matching (10/batch)
          </button>
        </div>
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem", maxWidth: "44rem" }}>
          <strong>Reprocess</strong> re-runs the Mailgun pipeline, extracts PDFs, and files health records — then clears
          the owner&apos;s Review Inbox. Fix edge secrets first (
          <code>PAWBUCK_API_URL</code>, <code>MILO_INTERNAL_SERVICE_KEY</code>). Re-run until eligible count is 0.
        </p>

        <div
          className="directory__toolbar"
          style={{ marginTop: "0.75rem", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}
        >
          <span className="muted" style={{ fontWeight: 600 }}>
            Inbox-only cleanup (no reprocess)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkClear("dismiss", true)}
          >
            Preview dismiss
          </button>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkClear("dismiss", false)}
          >
            Dismiss matching
          </button>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkClear("resolve", true)}
          >
            Preview resolve
          </button>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkClear("resolve", false)}
          >
            Resolve matching
          </button>
        </div>
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem", maxWidth: "44rem" }}>
          <strong>Dismiss / resolve</strong> only update inbox state — they do not extract or file documents.
        </p>
        {bulkClearMessage ? (
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            {bulkClearMessage}
          </p>
        ) : null}

        {listError ? <div className="error directory__err">{listError}</div> : null}
        {listLoading ? <p className="muted">Loading…</p> : null}

        {!listLoading && list.length === 0 && !listError ? (
          <p className="muted" style={{ marginTop: "1rem" }}>
            No rows match.
          </p>
        ) : null}

        {list.length > 0 ? (
          <div className="table-scroll" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>OK</th>
                  <th>Doc type</th>
                  <th>Review</th>
                  <th>Pet</th>
                  <th>Owner</th>
                  <th>Failure (snippet)</th>
                  <th>Subject</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.id}
                    className={`clickable ${selected?.id === row.id ? "selected" : ""}`}
                    onClick={() => void openRow(row)}
                  >
                    <td className="muted">
                      {(row.completedAt ?? row.startedAt ?? "").slice(0, 16).replace("T", " ") || "—"}
                    </td>
                    <td>{row.status}</td>
                    <td>{row.success == null ? "—" : row.success ? "yes" : "no"}</td>
                    <td>{row.documentType ?? "—"}</td>
                    <td>{row.reviewStatus ?? "—"}</td>
                    <td>
                      {row.petName ?? "—"}
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {row.petId ? formatShortId(row.petId) : "—"}
                      </div>
                    </td>
                    <td className="muted">{row.ownerEmail ?? "—"}</td>
                    <td style={{ maxWidth: "14rem", fontSize: "0.85rem" }}>
                      {row.failureReasonSnippet ?? row.failureReason ?? "—"}
                    </td>
                    <td style={{ maxWidth: "12rem", fontSize: "0.85rem" }}>{row.subject ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openRow(row);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {totalCount > pageSize ? (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Page {page} of {totalPages} ({totalCount} total){" "}
            <button
              type="button"
              className="btn-linkish"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>{" "}
            <button
              type="button"
              className="btn-linkish"
              disabled={page >= totalPages || listLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </p>
        ) : null}
      </section>

      <section className="panel" style={{ minWidth: 0 }}>
        <h2 className="panel__title">Detail</h2>
        {detailError ? <div className="error">{detailError}</div> : null}
        {detailLoading ? <p className="muted">Loading…</p> : null}
        {!detailLoading && !selected ? <p className="muted">Select a row to inspect failure_reason and attachments.</p> : null}
        {selected ? (
          <>
            <p style={{ fontSize: "0.85rem" }} className="muted">
              id {selected.id}
            </p>
            <p>
              <strong>Subject:</strong> {selected.subject ?? "—"}
            </p>
            <p>
              <strong>Sender:</strong> {selected.senderEmail ?? "—"}
            </p>
            <p>
              <strong>Pet:</strong> {selected.petName ?? "—"}{" "}
              {selected.petId ? <span className="muted">({selected.petId})</span> : null}
            </p>
            <p>
              <strong>Owner:</strong> {selected.ownerEmail ?? "—"}
            </p>
            <p>
              <strong>s3_key:</strong>{" "}
              <code style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>{selected.s3Key}</code>
            </p>
            <p>
              <strong>Pipeline status:</strong> {selected.status}{" "}
              <span className="muted">
                · success={selected.success == null ? "null" : String(selected.success)}
              </span>
            </p>
            <p>
              <strong>Review status:</strong> {selected.reviewStatus ?? "—"}
            </p>

            <h3 className="panel-sub">Diagnostics (no SQL)</h3>
            <div
              style={{
                fontSize: "0.85rem",
                padding: "0.75rem",
                marginBottom: "1rem",
                background: "var(--panel-subtle-bg, rgba(0,0,0,0.04))",
                borderRadius: "6px",
              }}
            >
              <p style={{ margin: "0 0 0.35rem" }}>
                <strong>Consumer Processing errors:</strong>{" "}
                {selected.consumerInboxVisible ? "visible" : "hidden"}
                {selected.consumerInboxHiddenReason ? (
                  <span className="muted"> — {selected.consumerInboxHiddenReason}</span>
                ) : null}
              </p>
              <p style={{ margin: "0 0 0.35rem" }}>
                <strong>Owner Confirm allowed:</strong> {selected.canOwnerResolve ? "yes" : "no"}
              </p>
              <p style={{ margin: "0 0 0.35rem" }}>
                <strong>pending-emails archive:</strong>{" "}
                <code>{selected.storedArchiveStatus ?? "—"}</code>
                {selected.storedArchiveMessage ? (
                  <span className="muted"> — {selected.storedArchiveMessage}</span>
                ) : null}
              </p>
              {selected.recommendedAction ? (
                <p style={{ margin: "0.5rem 0 0" }}>
                  <strong>Recommended:</strong> {selected.recommendedAction}
                </p>
              ) : null}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              <button
                type="button"
                className="btn btn-primary btn--sm"
                disabled={bulkClearBusy}
                onClick={() => void runBulkReprocess(false, [selected.id])}
              >
                Reprocess &amp; file
              </button>
              <button
                type="button"
                className="btn btn-secondary btn--sm"
                disabled={bulkClearBusy || selected.reviewStatus === "resolved"}
                onClick={() => void runBulkClear("resolve", false, [selected.id])}
              >
                Mark resolved only
              </button>
              <button
                type="button"
                className="btn btn-secondary btn--sm"
                disabled={bulkClearBusy || selected.reviewStatus === "dismissed"}
                onClick={() => void runBulkClear("dismiss", false, [selected.id])}
              >
                Dismiss
              </button>
            </div>
            <h3 className="panel-sub">failure_reason (full)</h3>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "0.85rem",
                maxHeight: "14rem",
                overflow: "auto",
                padding: "0.75rem",
                background: "var(--panel-subtle-bg, rgba(0,0,0,0.04))",
                borderRadius: "6px",
              }}
            >
              {selected.failureReason ?? "—"}
            </pre>

            <h3 className="panel-sub">Attachments</h3>
            {attachWarning ? (
              <div className="banner-warn" role="status" style={{ marginTop: "0.35rem" }}>
                {attachWarning}
              </div>
            ) : null}
            {attachMeta.code === "STORAGE_NOT_CONFIGURED" ? (
              <div className="banner-warn" role="status" style={{ marginTop: "0.5rem" }}>
                <strong>API storage not configured.</strong> Set on the PawBuck.API host:{" "}
                <code>Supabase__Url</code> + <code>Supabase__ServiceRoleKey</code>, or env{" "}
                <code>SUPABASE_SERVICE_ROLE_KEY</code> (see <code>appsettings.Local.example.json</code>), then restart
                the API. The list above still works with only the DB connection string.
              </div>
            ) : attachMeta.code ? (
              <p className="muted">{attachMeta.message ?? attachMeta.code}</p>
            ) : attachments.length === 0 ? (
              <p className="muted">No attachment metadata.</p>
            ) : (
              <ul style={{ paddingLeft: "1.1rem" }}>
                {attachments.map((a) => (
                  <li key={a.index} style={{ marginBottom: "0.35rem" }}>
                    <code>{a.filename}</code>{" "}
                    <span className="muted">
                      ({a.mimeType}, {formatBytes(a.size)})
                    </span>{" "}
                    <button
                      type="button"
                      className="btn btn-secondary btn--sm"
                      disabled={openBusy === a.index || Boolean(attachWarning)}
                      onClick={(e) => {
                        e.stopPropagation();
                        void openAttachment(a.index);
                      }}
                    >
                      {openBusy === a.index ? "…" : "Open"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
