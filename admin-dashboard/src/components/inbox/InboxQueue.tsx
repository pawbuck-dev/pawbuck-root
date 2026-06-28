import type { SupportProcessedEmailListItem, SupportProcessedEmailsSummaryResponse } from "@/types/support";
import type { InboxTab } from "./inboxUtils";
import { formatShortId, formatWhen, ownerVisibilityLabel, problemSummary } from "./inboxUtils";

type Props = {
  tab: InboxTab;
  onTabChange: (tab: InboxTab) => void;
  summary: SupportProcessedEmailsSummaryResponse | null;
  ownerEmail: string;
  onOwnerEmailChange: (v: string) => void;
  q: string;
  onQChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onPreset: (days: number) => void;
  onRefresh: () => void;
  onOpenBatchTools: () => void;
  list: SupportProcessedEmailListItem[];
  listLoading: boolean;
  listError: string | null;
  selectedId: string | null;
  onSelectRow: (row: SupportProcessedEmailListItem) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  actionMessage: string | null;
};

const TAB_LABELS: { id: InboxTab; label: string; count?: (s: SupportProcessedEmailsSummaryResponse) => number }[] = [
  { id: "needs-action", label: "Needs action", count: (s) => s.totalReviewInboxCandidates ?? 0 },
  { id: "stuck", label: "Stuck", count: (s) => s.totalStuckProcessing ?? 0 },
  { id: "history", label: "History" },
];

function visibilityBadgeClass(tone: "visible" | "hidden" | "stuck"): string {
  if (tone === "visible") return "inbox-badge inbox-badge--danger";
  if (tone === "stuck") return "inbox-badge inbox-badge--warn";
  return "inbox-badge inbox-badge--muted";
}

export function InboxQueue({
  tab,
  onTabChange,
  summary,
  ownerEmail,
  onOwnerEmailChange,
  q,
  onQChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onPreset,
  onRefresh,
  onOpenBatchTools,
  list,
  listLoading,
  listError,
  selectedId,
  onSelectRow,
  page,
  totalPages,
  totalCount,
  onPageChange,
  actionMessage,
}: Props) {
  return (
    <section className="panel panel--flush inbox-queue" style={{ minWidth: 0 }}>
      <div className="inbox-tabs" role="tablist" aria-label="Inbox queue">
        {TAB_LABELS.map((t) => {
          const n = summary && t.count ? t.count(summary) : undefined;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`inbox-tab ${tab === t.id ? "inbox-tab--active" : ""}`}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
              {n != null && n > 0 ? <span className="inbox-tab__count">{n > 99 ? "99+" : n}</span> : null}
            </button>
          );
        })}
        <button type="button" className="inbox-tab inbox-tab--tools" onClick={onOpenBatchTools}>
          Batch tools…
        </button>
      </div>

      {summary ? (
        <p className="muted inbox-summary" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
          Last {Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) || 30} days ·{" "}
          <strong>{summary.totalReviewInboxCandidates ?? 0}</strong> need action ·{" "}
          <strong>{summary.totalStuckProcessing ?? 0}</strong> stuck
        </p>
      ) : null}

      <div className="inbox-filters">
        <div className="inbox-filters__presets">
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => onPreset(7)}>
            7d
          </button>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => onPreset(30)}>
            30d
          </button>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => onPreset(90)}>
            90d
          </button>
        </div>
        <input
          className="directory__search inbox-filters__search"
          placeholder="Search subject or error…"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          aria-label="Search"
        />
        <input
          className="directory__search"
          placeholder="Owner email"
          value={ownerEmail}
          onChange={(e) => onOwnerEmailChange(e.target.value)}
          aria-label="Owner email"
          style={{ minWidth: "9rem" }}
        />
        <label className="muted inbox-filters__date">
          From
          <input type="date" className="directory__search" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </label>
        <label className="muted inbox-filters__date">
          To
          <input type="date" className="directory__search" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </label>
        <button type="button" className="btn btn-secondary btn--sm" disabled={listLoading} onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {actionMessage ? (
        <p className="inbox-action-message muted" role="status">
          {actionMessage}
        </p>
      ) : null}

      {listError ? <div className="error directory__err">{listError}</div> : null}
      {listLoading ? <p className="muted">Loading…</p> : null}

      {!listLoading && list.length === 0 && !listError ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          {tab === "needs-action"
            ? "Nothing needs action in this date range — owners are not seeing Processing errors."
            : tab === "stuck"
              ? "No stuck processing locks."
              : "No completed emails in this range."}
        </p>
      ) : null}

      {list.length > 0 ? (
        <div className="table-scroll" style={{ marginTop: "0.75rem" }}>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Subject</th>
                <th>Pet</th>
                <th>Owner</th>
                <th>Problem</th>
                <th>Owner sees?</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const vis = ownerVisibilityLabel(row);
                return (
                  <tr
                    key={row.id}
                    className={`clickable ${selectedId === row.id ? "selected" : ""}`}
                    onClick={() => onSelectRow(row)}
                  >
                    <td className="muted">{formatWhen(row.completedAt ?? row.startedAt)}</td>
                    <td style={{ maxWidth: "11rem", fontSize: "0.9rem" }}>{row.subject ?? "—"}</td>
                    <td>
                      {row.petName ?? "—"}
                      <div className="muted" style={{ fontSize: "0.75rem" }}>
                        {row.petId ? formatShortId(row.petId) : "—"}
                      </div>
                    </td>
                    <td className="muted" style={{ maxWidth: "10rem", fontSize: "0.85rem" }}>
                      {row.ownerEmail ?? "—"}
                    </td>
                    <td style={{ maxWidth: "14rem", fontSize: "0.85rem" }}>{problemSummary(row)}</td>
                    <td>
                      <span className={visibilityBadgeClass(vis.tone)}>{vis.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {totalCount > 25 ? (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Page {page} of {totalPages} ({totalCount} total){" "}
          <button
            type="button"
            className="btn-linkish"
            disabled={page <= 1 || listLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>{" "}
          <button
            type="button"
            className="btn-linkish"
            disabled={page >= totalPages || listLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </p>
      ) : null}
    </section>
  );
}
