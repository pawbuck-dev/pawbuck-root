import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type { MiloClassifyExtractPreviewResponse } from "@/types/support";
import { useCallback, useState, type ChangeEvent } from "react";

type MiloClassifyHarnessProps = {
  client: ReturnType<typeof createSupportClient>;
};

function stripDataUrlPrefix(dataUrl: string): string {
  const t = dataUrl.trim();
  if (!t.toLowerCase().startsWith("data:")) return t;
  const comma = t.indexOf(",");
  return comma >= 0 ? t.slice(comma + 1) : t;
}

function prettyJson(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return "—";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function MiloClassifyHarness({ client }: MiloClassifyHarnessProps) {
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [base64Payload, setBase64Payload] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MiloClassifyExtractPreviewResponse | null>(null);
  const [showLegacyPrompt, setShowLegacyPrompt] = useState(false);
  const [showFlexiblePrompt, setShowFlexiblePrompt] = useState(false);

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setResult(null);
    if (!file) {
      setFileLabel(null);
      setBase64Payload(null);
      return;
    }
    setFileLabel(`${file.name} (${file.type || "unknown type"})`);
    const mt = file.type && file.type.length > 0 ? file.type : "image/jpeg";
    setMimeType(mt);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setBase64Payload(stripDataUrlPrefix(dataUrl));
    };
    reader.onerror = () => {
      setError("Could not read file.");
      setBase64Payload(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const run = async () => {
    if (!base64Payload?.trim()) {
      setError("Choose a file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await client.classifyMiloExtractPreview({
        fileBase64: base64Payload,
        mimeType,
      });
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err instanceof SupportApiError ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel panel--flush">
      <h2 className="panel__title">Milo document preview</h2>
      <p className="muted">
        Runs the same steps as the consumer app vision pipeline: <strong>classification</strong>, then <strong>flexible vault extraction</strong>{" "}
        (JSON with <code>title</code>, <code>summary</code>, <code>primaryDate</code>, <code>keyFacts</code>, <code>confidenceScore</code>) — matching{" "}
        <code>MiloVisionService</code> and the Gemini <code>response_schema</code> used there. Nothing is written to storage or Postgres.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="milo-classify-file" className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
          File
        </label>
        <input id="milo-classify-file" type="file" accept="image/*,application/pdf" onChange={onFileChange} />
        {fileLabel ? (
          <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.9rem" }}>
            Selected: {fileLabel}
          </p>
        ) : null}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="milo-mime" className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
          MIME type (edit if the browser did not set one)
        </label>
        <input
          id="milo-mime"
          type="text"
          value={mimeType}
          onChange={(e) => setMimeType(e.target.value)}
          placeholder="image/jpeg"
          style={{ maxWidth: "24rem", width: "100%" }}
        />
      </div>

      <p style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn btn-primary" disabled={loading || !base64Payload} onClick={() => void run()}>
          {loading ? "Running…" : "Run classification & extraction"}
        </button>
      </p>

      {error ? <div className="error">{error}</div> : null}

      {result ? (
        <div style={{ marginTop: "1rem" }}>
          <h3 className="panel-sub">Classification</h3>
          <p>
            <strong>documentType (raw):</strong> <code>{result.documentType}</code>
          </p>
          <p>
            <strong>normalizedDocumentType (vault):</strong> <code>{result.normalizedDocumentType}</code>
          </p>
          <p>
            <strong>confidence:</strong> {result.confidence}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>
            <strong>reasoning:</strong> {result.reasoning ?? "—"}
          </p>

          <h3 className="panel-sub" style={{ marginTop: "1.25rem" }}>
            Prompts (by document type)
          </h3>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            <strong>Legacy / GetPromptForType</strong> — older medical-record schema (items, dateOfVisit, …). Shown for parity with{" "}
            <code>/api/document/classify</code>.
          </p>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => setShowLegacyPrompt((s) => !s)}>
            {showLegacyPrompt ? "Hide" : "Show"} legacy extraction prompt
          </button>
          {showLegacyPrompt ? (
            <pre
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                maxHeight: "14rem",
                overflow: "auto",
                fontSize: "0.78rem",
                background: "var(--panel-subtle, #1a1a1e)",
                borderRadius: "6px",
              }}
            >
              {result.extractionPromptByType}
            </pre>
          ) : null}

          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            <strong>Flexible vault</strong> — same template as production <code>GetFlexibleExtractionPrompt</code> + Gemini JSON schema (title, summary, keyFacts,
            …).
          </p>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => setShowFlexiblePrompt((s) => !s)}>
            {showFlexiblePrompt ? "Hide" : "Show"} flexible extraction prompt
          </button>
          {showFlexiblePrompt ? (
            <pre
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                maxHeight: "14rem",
                overflow: "auto",
                fontSize: "0.78rem",
                background: "var(--panel-subtle, #1a1a1e)",
                borderRadius: "6px",
              }}
            >
              {result.flexibleExtractionPrompt}
            </pre>
          ) : null}

          <h3 className="panel-sub" style={{ marginTop: "1.25rem" }}>
            Extracted JSON (vault output)
          </h3>
          {result.extractionError ? (
            <div className="error" role="alert">
              Extraction failed: {result.extractionError}
            </div>
          ) : null}
          <pre
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem",
              maxHeight: "24rem",
              overflow: "auto",
              fontSize: "0.8rem",
              lineHeight: 1.45,
              background: "var(--panel-subtle, #1a1a1e)",
              borderRadius: "6px",
            }}
          >
            {prettyJson(result.extractedJson)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
