import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type { SupportOpsHealthResponse, SupportProcessedEmailListItem } from "@/types/support";
import { useCallback, useEffect, useState } from "react";

type Props = {
  client: ReturnType<typeof createSupportClient>;
  onOpenMailErrors: (ownerEmail?: string) => void;
  onOpenProcessing: () => void;
};

export function EmailProcessingTuningGuide() {
  return (
    <section className="panel" style={{ marginTop: "1rem" }}>
      <h3 className="panel__title">Fine-tuning guide (no app store update)</h3>
      <p className="muted" style={{ maxWidth: "52rem" }}>
        Most email/OCR fixes ship via Supabase Edge, PawBuck.API, or Postgres — not a mobile release.
      </p>
      <table>
        <thead>
          <tr>
            <th>What you want to change</th>
            <th>Where</th>
            <th>Deploy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pet name/breed validation rules</td>
            <td>Settings → Email verification (per country)</td>
            <td>Instant (Postgres)</td>
          </tr>
          <tr>
            <td>Classification, retries, owner error text</td>
            <td>Edge <code>mailgun-process-pet-mail</code></td>
            <td><code>supabase functions deploy mailgun-process-pet-mail</code></td>
          </tr>
          <tr>
            <td>Milo vault filing / analyze-internal</td>
            <td>PawBuck.API + <code>Milo__InternalServiceKey</code></td>
            <td>ECS / GitHub Actions deploy</td>
          </tr>
          <tr>
            <td>504 timeouts</td>
            <td>Edge retries + ALB idle timeout</td>
            <td>Edge deploy + infra</td>
          </tr>
          <tr>
            <td>Success/failure metrics</td>
            <td>Processing tab</td>
            <td>API deploy only</td>
          </tr>
        </tbody>
      </table>
      <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        Full UAT matrix: <code>docs/EMAIL-PROCESSING-UAT.md</code> · Deploy checklist:{" "}
        <code>docs/EMAIL-OPS-DEPLOY.md</code>
      </p>
    </section>
  );
}

export function EmailOpsPanel({ client, onOpenMailErrors, onOpenProcessing }: Props) {
  const [ownerEmail, setOwnerEmail] = useState("");
  const [health, setHealth] = useState<SupportOpsHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [stuckRows, setStuckRows] = useState<SupportProcessedEmailListItem[]>([]);
  const [reprocessBatchSize, setReprocessBatchSize] = useState(25);
  const [reprocessDocType, setReprocessDocType] =
    useState<"vaccinations" | "medications" | "lab_results" | "clinical_exams">("vaccinations");

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await client.getOpsHealth();
      setHealth(res);
    } catch (e) {
      setHealth(null);
      setHealthError(e instanceof SupportApiError ? e.message : "Could not load pipeline health.");
    } finally {
      setHealthLoading(false);
    }
  }, [client]);

  const loadStuckRows = useCallback(async () => {
    try {
      const res = await client.listProcessedEmails({
        page: 1,
        pageSize: 20,
        reviewInboxOnly: true,
        failuresOnly: false,
      });
      setStuckRows(res.items.filter((r) => r.status === "processing"));
    } catch {
      setStuckRows([]);
    }
  }, [client]);

  useEffect(() => {
    void loadHealth();
    void loadStuckRows();
  }, [loadHealth, loadStuckRows]);

  const ownerFilter = ownerEmail.trim() || undefined;

  const runReprocessBatch = async (dryRun: boolean, maxRows: number) => {
    return client.bulkReprocessReviewInbox({
      dryRun,
      defaultDocType: reprocessDocType,
      includeDismissed: true,
      maxRows,
      ownerEmail: ownerFilter,
    });
  };

  const fileAllReady = async () => {
    const preview = await runReprocessBatch(true, reprocessBatchSize);
    if (preview.eligibleCount === 0) {
      setActionMessage("No emails are ready to file (need stored archive + pet linked).");
      return;
    }
    const label = ownerFilter ? `for ${ownerFilter}` : "in the backlog";
    const ok = window.confirm(
      `File up to ${preview.eligibleCount} email(s) ${label}?\n\nThis adds health records to pet profiles (same as owner Confirm).`,
    );
    if (!ok) return;

    setActionBusy(true);
    setActionMessage(null);
    let remaining = preview.eligibleCount;
    let totalSucceeded = 0;
    let iterations = 0;
    const maxIterations = 20;

    try {
      while (remaining > 0 && iterations < maxIterations) {
        iterations += 1;
        const res = await runReprocessBatch(false, reprocessBatchSize);
        totalSucceeded += res.succeededCount;
        remaining = Math.max(0, res.eligibleCount - res.attemptedCount);
        if (res.attemptedCount === 0) break;
        if (res.succeededCount === 0 && res.failedCount > 0) {
          setActionMessage(
            `${res.message} Stopped after batch ${iterations} (${totalSucceeded} filed so far). Check Mail errors for details.`,
          );
          return;
        }
      }
      setActionMessage(
        `Done. Filed ${totalSucceeded} email batch(es) ${label}. ${remaining > 0 ? `${remaining} may still match — run again or check Mail errors.` : ""}`,
      );
      await loadStuckRows();
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "File records failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const clearFromApp = async () => {
    const scope = ownerFilter ? `for ${ownerFilter}` : "matching filters";
    const ok = window.confirm(
      `Remove errors from the app ${scope} without filing records?\n\nUse when the owner should not see the row anymore and data is already handled elsewhere.`,
    );
    if (!ok) return;

    setActionBusy(true);
    setActionMessage(null);
    try {
      const preview = await client.bulkClearReviewInbox({
        action: "dismiss",
        dryRun: true,
        ownerEmail: ownerFilter,
        maxRows: 500,
      });
      if (preview.matchingCount === 0) {
        setActionMessage("No rows match to clear.");
        return;
      }
      const res = await client.bulkClearReviewInbox({
        action: "dismiss",
        dryRun: false,
        ownerEmail: ownerFilter,
        maxRows: 500,
      });
      setActionMessage(res.message);
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "Clear from app failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const unlockStuck = async (id: string) => {
    setActionBusy(true);
    setActionMessage(null);
    try {
      const res = await client.releaseStuckLock(id);
      setActionMessage(res.message);
      await loadStuckRows();
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "Unlock failed.");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <>
      <section className="panel">
        <h2 className="panel__title">Email ops (backup)</h2>
        <p className="muted" style={{ maxWidth: "48rem" }}>
          For when a pet owner is stuck. Owners should normally fix errors in the app via{" "}
          <strong>Messages → Processing errors → Confirm</strong>. Use these buttons only when you need to help.
        </p>

        <div className="directory__toolbar" style={{ marginTop: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <label className="muted" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 260 }}>
            Help this pet owner (email)
            <input
              className="directory__search"
              type="email"
              placeholder="owner@example.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </label>
          <label className="muted" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Default doc type when filing
            <select
              className="directory__search"
              value={reprocessDocType}
              onChange={(e) =>
                setReprocessDocType(
                  e.target.value as "vaccinations" | "medications" | "lab_results" | "clinical_exams",
                )
              }
            >
              <option value="vaccinations">Vaccinations</option>
              <option value="medications">Medications</option>
              <option value="lab_results">Lab results</option>
              <option value="clinical_exams">Clinical exams</option>
            </select>
          </label>
          <label className="muted" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Batch size
            <select
              className="directory__search"
              value={reprocessBatchSize}
              onChange={(e) => setReprocessBatchSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        <div className="directory__toolbar" style={{ marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" className="btn btn-secondary" disabled={healthLoading} onClick={() => void loadHealth()}>
            Check pipeline health
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={actionBusy}
            onClick={() => void fileAllReady()}
          >
            Add records to pet profile (file all ready)
          </button>
          <button type="button" className="btn btn-secondary" disabled={actionBusy} onClick={() => void clearFromApp()}>
            Remove from app (no filing)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onOpenMailErrors(ownerFilter)}
          >
            Show open errors
          </button>
          <button type="button" className="btn btn-secondary" onClick={onOpenProcessing}>
            View quality trends
          </button>
        </div>

        {healthError ? <div className="error" style={{ marginTop: "0.75rem" }}>{healthError}</div> : null}

        {health ? (
          <div style={{ marginTop: "1rem" }}>
            <p className="muted">
              Pipeline status:{" "}
              <strong style={{ color: health.allReady ? "#0d9488" : "#dc2626" }}>
                {health.allReady ? "Ready" : "Needs attention"}
              </strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {health.checks.map((c) => (
                <li key={c.id} style={{ marginBottom: 6 }}>
                  <strong>{c.ok ? "OK" : "Fix"}</strong> — {c.label}
                  {!c.ok ? <span className="muted"> · {c.hint}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {stuckRows.length > 0 ? (
          <div style={{ marginTop: "1.25rem" }}>
            <h3 className="chart-panel__title">Stuck emails (unlock)</h3>
            <p className="muted">These are locked as processing and block owner Confirm until unlocked.</p>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Owner</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stuckRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.subject ?? "—"}</td>
                    <td>{row.ownerEmail ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn--sm"
                        disabled={actionBusy}
                        onClick={() => void unlockStuck(row.id)}
                      >
                        Unlock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {actionMessage ? (
          <p className="muted" style={{ marginTop: "1rem", maxWidth: "48rem" }}>
            {actionMessage}
          </p>
        ) : null}

        <div className="muted" style={{ marginTop: "1.25rem", fontSize: "0.9rem", maxWidth: "48rem" }}>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Add records to pet profile</strong> — extracts PDFs and saves vaccinations/meds/etc. (same as owner
            Confirm).
          </p>
          <p style={{ margin: 0 }}>
            <strong>Remove from app</strong> — hides the error in Messages; does <em>not</em> add health records.
          </p>
        </div>
      </section>

      <EmailProcessingTuningGuide />
    </>
  );
}
