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

export function ProcessedEmailsPanel({ client }: Props) {
  const [dateFrom, setDateFrom] = useState(() => startOfUtcDayYmd(7));
  const [dateTo, setDateTo] = useState(() => toYmd(new Date()));
  const [documentType, setDocumentType] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [q, setQ] = useState("");
  const [failuresOnly, setFailuresOnly] = useState(true);
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
        failuresOnly,
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
  }, [client, page, pageSize, fromIso, toIso, documentType, reviewStatus, q, failuresOnly]);

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

  const bulkClearFilters = useMemo(
    () => ({
      from: fromIso,
      to: toIso,
      ownerEmail: bulkClearOwnerEmail.trim() || undefined,
      maxRows: 500,
    }),
    [fromIso, toIso, bulkClearOwnerEmail],
  );

  const runBulkClear = async (dryRun: boolean) => {
    if (!dryRun) {
      const ok = window.confirm(
        "Dismiss all matching Review Inbox rows for consumer Messages? Health records already saved are not deleted.",
      );
      if (!ok) return;
    }
    setBulkClearBusy(true);
    setBulkClearMessage(null);
    try {
      const res = await client.bulkClearReviewInbox({
        action: "dismiss",
        dryRun,
        ...bulkClearFilters,
      });
      setBulkClearMessage(res.message);
      if (!dryRun && res.updatedCount > 0) {
        await loadList();
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
          Failed rows from <code>processed_emails</code> (Mailgun pipeline). Search <code>q</code> matches{" "}
          <strong>failure_reason</strong> and <strong>subject</strong> (OCR / extract / billing text, etc.). Opening
          attachments requires the API to have <code>Supabase:Url</code> and <code>Supabase:ServiceRoleKey</code> (or{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>).
        </p>

        {summary ? (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            <strong>{summary.totalFailures}</strong> failures in range · Top types:{" "}
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
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={!failuresOnly}
              onChange={(e) => {
                setFailuresOnly(!e.target.checked);
                setPage(1);
              }}
            />
            <span className="muted">Show successful</span>
          </label>
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
            Review Inbox cleanup
          </span>
          <input
            className="directory__search"
            style={{ minWidth: "10rem", flex: "1 1 10rem" }}
            placeholder="Owner email (optional)"
            value={bulkClearOwnerEmail}
            onChange={(e) => setBulkClearOwnerEmail(e.target.value)}
            aria-label="Owner email for bulk clear"
          />
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkClear(true)}
          >
            Preview dismiss
          </button>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={bulkClearBusy}
            onClick={() => void runBulkClear(false)}
          >
            Dismiss matching
          </button>
        </div>
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
                  <th>Completed</th>
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
                    <td className="muted">{(row.completedAt ?? "").slice(0, 16).replace("T", " ") || "—"}</td>
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
