import type { InboxClient } from "./useInboxController";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  client: InboxClient;
  bulkActionFilters: { from: string; to: string; ownerEmail?: string };
  onDone: (message: string) => void;
};

type BatchAction = "try_again" | "hide" | "clear" | "remove_false";

export function InboxBatchTools({ open, onClose, client, bulkActionFilters, onDone }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [action, setAction] = useState<BatchAction>("try_again");
  const [docType, setDocType] = useState<"vaccinations" | "medications" | "lab_results" | "clinical_exams">(
    "vaccinations",
  );
  const [includeDismissed, setIncludeDismissed] = useState(true);
  const [petName, setPetName] = useState("");
  const [batchSize, setBatchSize] = useState(25);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setPreview(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const actionLabel: Record<BatchAction, string> = {
    try_again: "Try again (extract records)",
    hide: "Hide from owner",
    clear: "Clear error (records already OK)",
    remove_false: "Remove false completions",
  };

  const runPreview = async () => {
    setBusy(true);
    setPreview(null);
    try {
      if (action === "try_again") {
        const res = await client.bulkReprocessReviewInbox({
          dryRun: true,
          defaultDocType: docType,
          includeDismissed,
          maxRows: batchSize,
          ...bulkActionFilters,
        });
        setPreview(`${res.message} · Eligible: ${res.eligibleCount ?? 0}`);
      } else if (action === "remove_false") {
        const res = await client.bulkDeleteGhostSuccess({
          dryRun: true,
          ...bulkActionFilters,
          petName: petName.trim() || undefined,
          maxRows: 500,
        });
        setPreview(`${res.message} · Matching: ${res.matchingCount ?? 0}`);
      } else {
        const res = await client.bulkClearReviewInbox({
          action: action === "hide" ? "dismiss" : "resolve",
          dryRun: true,
          ...bulkActionFilters,
          maxRows: 500,
        });
        setPreview(`${res.message} · Would update: ${res.matchingCount ?? 0}`);
      }
      setStep(3);
    } catch (e) {
      setPreview(e instanceof Error ? e.message : "Preview failed");
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  const runExecute = async () => {
    const ok = window.confirm(`Run "${actionLabel[action]}" for the current date range and filters?`);
    if (!ok) return;
    setBusy(true);
    try {
      if (action === "try_again") {
        const res = await client.bulkReprocessReviewInbox({
          dryRun: false,
          defaultDocType: docType,
          includeDismissed,
          maxRows: batchSize,
          ...bulkActionFilters,
        });
        onDone(res.message);
      } else if (action === "remove_false") {
        const res = await client.bulkDeleteGhostSuccess({
          dryRun: false,
          ...bulkActionFilters,
          petName: petName.trim() || undefined,
          maxRows: 500,
        });
        onDone(res.message);
      } else {
        const res = await client.bulkClearReviewInbox({
          action: action === "hide" ? "dismiss" : "resolve",
          dryRun: false,
          ...bulkActionFilters,
          maxRows: 500,
        });
        onDone(res.message);
      }
      close();
    } catch (e) {
      onDone(e instanceof Error ? e.message : "Batch action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inbox-modal-backdrop" role="presentation" onClick={close}>
      <div
        className="inbox-modal"
        role="dialog"
        aria-labelledby="inbox-batch-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="inbox-batch-title" className="panel__title">
          Batch tools
        </h2>
        <p className="muted" style={{ fontSize: "0.9rem", maxWidth: "32rem" }}>
          Uses the same date range and owner email filter as the queue. Preview before running.
        </p>

        {step === 1 ? (
          <>
            <fieldset className="inbox-batch-fieldset">
              <legend>Choose action</legend>
              {(Object.keys(actionLabel) as BatchAction[]).map((a) => (
                <label key={a} className="inbox-batch-option">
                  <input
                    type="radio"
                    name="batchAction"
                    checked={action === a}
                    onChange={() => setAction(a)}
                  />
                  {actionLabel[a]}
                </label>
              ))}
            </fieldset>
            <div className="inbox-modal__footer">
              <button type="button" className="btn btn-secondary" onClick={close}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            {action === "try_again" ? (
              <div className="inbox-batch-options">
                <label>
                  Default document type
                  <select
                    className="directory__search"
                    value={docType}
                    onChange={(e) =>
                      setDocType(e.target.value as typeof docType)
                    }
                  >
                    <option value="vaccinations">Vaccine</option>
                    <option value="medications">Medication</option>
                    <option value="lab_results">Lab</option>
                    <option value="clinical_exams">Clinical visit</option>
                  </select>
                </label>
                <label>
                  Batch size
                  <select
                    className="directory__search"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <label className="inbox-batch-check">
                  <input
                    type="checkbox"
                    checked={includeDismissed}
                    onChange={(e) => setIncludeDismissed(e.target.checked)}
                  />
                  Include dismissed rows
                </label>
              </div>
            ) : null}
            {action === "remove_false" ? (
              <label>
                Pet name filter (optional)
                <input
                  className="directory__search"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Milo"
                />
              </label>
            ) : null}
            <div className="inbox-modal__footer">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runPreview()}>
                {busy ? "…" : "Preview"}
              </button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="inbox-batch-preview">{preview ?? "No preview result."}</p>
            <div className="inbox-modal__footer">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runExecute()}>
                {busy ? "…" : "Run"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
