import { useCallback, useState } from "react";
import { SupportApiError } from "@/api/supportClient";
import type { SupportDocumentSyncRunResponse } from "@/types/support";

type SupportClient = ReturnType<typeof import("@/api/supportClient").createSupportClient>;

type Props = {
  client: SupportClient;
};

const BATCH_OPTIONS = [10, 20, 50, 100] as const;

export function DocumentSyncAdminPanel({ client }: Props) {
  const [batchSize, setBatchSize] = useState<number>(20);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SupportDocumentSyncRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await client.runPendingDocumentSync(batchSize);
      setResult(r);
    } catch (e) {
      setResult(null);
      setError(e instanceof SupportApiError ? e.message : e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }, [client, batchSize]);

  return (
    <section className="operations-card" aria-labelledby="doc-sync-heading">
      <h3 id="doc-sync-heading" className="operations-card__title">
        Vault → clinical sync
      </h3>
      <p className="muted operations-card__lede">
        Runs one batch for <code>pet_documents</code> where <code>clinical_synced_at</code> is null (vaccinations, medications,
        clinical exams, lab results). Same processing as the API&apos;s optional background worker—useful after outages or bad
        deploys without turning continuous sync on.
      </p>
      <div className="operations-card__row">
        <label className="operations-card__label" htmlFor="doc-sync-batch">
          Batch size
        </label>
        <select
          id="doc-sync-batch"
          className="operations-card__select"
          value={batchSize}
          onChange={(ev) => setBatchSize(Number(ev.target.value))}
          disabled={busy}
        >
          {BATCH_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} rows
            </option>
          ))}
        </select>
        <button type="button" className="btn" disabled={busy} onClick={() => void run()}>
          {busy ? "Running…" : "Run sync now"}
        </button>
      </div>
      {error ? <p className="error operations-card__msg">{error}</p> : null}
      {result ? (
        <p className="operations-card__msg">
          <strong>{result.rowsAttempted}</strong> row(s) attempted. {result.message ?? ""}
        </p>
      ) : null}
    </section>
  );
}
