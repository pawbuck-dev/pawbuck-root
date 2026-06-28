import type {
  SupportProcessedEmailAttachment,
  SupportProcessedEmailDetail,
} from "@/types/support";
import { useState } from "react";
import { Link } from "react-router-dom";
import { buildCaseFileUi, RESEND_INSTRUCTIONS } from "./inboxCaseLogic";
import { formatBytes, formatWhen } from "./inboxUtils";

type Props = {
  detail: SupportProcessedEmailDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  attachments: SupportProcessedEmailAttachment[];
  attachMeta: { code: string | null; message: string | null };
  attachWarning: string | null;
  openBusy: number | null;
  actionBusy: boolean;
  onOpenAttachment: (index: number) => void;
  onTryAgain: () => void;
  onClearError: () => void;
  onHideFromOwner: () => void;
  onReleaseLock: () => void;
  onRemoveFalseRow: () => void;
  onCopyResend: () => void;
};

function bannerClass(tone: string): string {
  return `inbox-banner inbox-banner--${tone}`;
}

export function InboxCaseFile({
  detail,
  detailLoading,
  detailError,
  attachments,
  attachMeta,
  attachWarning,
  openBusy,
  actionBusy,
  onOpenAttachment,
  onTryAgain,
  onClearError,
  onHideFromOwner,
  onReleaseLock,
  onRemoveFalseRow,
  onCopyResend,
}: Props) {
  const [techOpen, setTechOpen] = useState(false);

  if (detailLoading) {
    return (
      <section className="panel inbox-case">
        <h2 className="panel__title">Case file</h2>
        <p className="muted">Loading…</p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="panel inbox-case">
        <h2 className="panel__title">Case file</h2>
        <p className="muted">Select an email to see what happened and what to do next.</p>
      </section>
    );
  }

  const ui = buildCaseFileUi(detail);
  const petSearch = detail.petName?.trim() || "";

  const runPrimary = () => {
    switch (ui.primaryAction) {
      case "try_again":
        onTryAgain();
        break;
      case "release_lock":
        onReleaseLock();
        break;
      case "ask_resend":
        onCopyResend();
        break;
      case "verify_pet_profile":
      case "none":
        break;
    }
  };

  return (
    <section className="panel inbox-case" style={{ minWidth: 0 }}>
      <h2 className="panel__title">Case file</h2>
      {detailError ? <div className="error">{detailError}</div> : null}

      <div className={bannerClass(ui.bannerTone)} role="status">
        <strong>{ui.bannerTitle}</strong>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>{ui.bannerDetail}</p>
      </div>

      <dl className="inbox-case__meta">
        <div>
          <dt>Subject</dt>
          <dd>{detail.subject ?? "—"}</dd>
        </div>
        <div>
          <dt>Pet</dt>
          <dd>
            {detail.petName ?? "—"}
            {detail.petId && petSearch ? (
              <>
                {" "}
                <Link to={`/customers/pets?q=${encodeURIComponent(petSearch)}`} className="inbox-link">
                  Open in Pets
                </Link>
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>
            {detail.ownerEmail ?? "—"}
            {detail.ownerEmail ? (
              <>
                {" "}
                <Link
                  to={`/email/inbox?owner=${encodeURIComponent(detail.ownerEmail)}&tab=history`}
                  className="inbox-link"
                >
                  All emails
                </Link>
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>From</dt>
          <dd>{detail.senderEmail ?? "—"}</dd>
        </div>
        <div>
          <dt>Processed</dt>
          <dd>{formatWhen(detail.completedAt ?? detail.startedAt)}</dd>
        </div>
        <div>
          <dt>Email copy on file</dt>
          <dd>
            {ui.emailCopyLabel}
            {ui.emailCopyDetail ? (
              <span className="muted" style={{ display: "block", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                {ui.emailCopyDetail}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="inbox-case__actions">
        {ui.primaryAction === "verify_pet_profile" && detail.petId && petSearch ? (
          <Link
            to={`/customers/pets?q=${encodeURIComponent(petSearch)}`}
            className="btn btn-primary btn--sm"
          >
            {ui.primaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn--sm"
            disabled={actionBusy || ui.primaryDisabled}
            title={ui.primaryDisabledReason}
            onClick={runPrimary}
          >
            {ui.primaryLabel}
          </button>
        )}
        {ui.showClearError ? (
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={actionBusy || detail.reviewStatus === "resolved"}
            onClick={onClearError}
          >
            Clear error
          </button>
        ) : null}
        {ui.showHideFromOwner ? (
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={actionBusy || detail.reviewStatus === "dismissed"}
            onClick={onHideFromOwner}
          >
            Hide from owner
          </button>
        ) : null}
        {ui.showRemoveFalseRow ? (
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={actionBusy}
            onClick={onRemoveFalseRow}
          >
            Remove false row
          </button>
        ) : null}
      </div>

      {attachments.length > 0 ? (
        <>
          <h3 className="panel-sub">Attachments</h3>
          {attachWarning ? (
            <div className="banner-warn" role="status">
              {attachWarning}
            </div>
          ) : null}
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
                  disabled={openBusy === a.index}
                  onClick={() => onOpenAttachment(a.index)}
                >
                  {openBusy === a.index ? "…" : "Open"}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : attachMeta.code ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {attachMeta.message ?? attachMeta.code}
        </p>
      ) : null}

      <button
        type="button"
        className="inbox-tech-toggle"
        aria-expanded={techOpen}
        onClick={() => setTechOpen((o) => !o)}
      >
        {techOpen ? "Hide" : "Show"} technical details
      </button>
      {techOpen ? (
        <div className="inbox-tech">
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            id: {detail.id}
          </p>
          <p>
            <strong>Pipeline:</strong> {detail.status} · success=
            {detail.success == null ? "null" : String(detail.success)}
          </p>
          <p>
            <strong>Review:</strong> {detail.reviewStatus ?? "—"} · doc type: {detail.documentType ?? "—"} ·
            attachments filed: {detail.attachmentCount ?? 0}
          </p>
          <p>
            <strong>Owner inbox:</strong> {detail.consumerInboxVisible ? "visible" : "hidden"}
            {detail.consumerInboxHiddenReason ? (
              <span className="muted"> — {detail.consumerInboxHiddenReason}</span>
            ) : null}
          </p>
          <p>
            <strong>Message-Id:</strong>{" "}
            <code style={{ wordBreak: "break-all", fontSize: "0.75rem" }}>{detail.s3Key}</code>
          </p>
          {detail.failureReason ? (
            <>
              <strong>Full error</strong>
              <pre className="inbox-tech__pre">{detail.failureReason}</pre>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export { RESEND_INSTRUCTIONS };
