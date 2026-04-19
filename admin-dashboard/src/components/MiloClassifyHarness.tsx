import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type { MiloClassifyResponse } from "@/types/support";
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

export function MiloClassifyHarness({ client }: MiloClassifyHarnessProps) {
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [base64Payload, setBase64Payload] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MiloClassifyResponse | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

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
      const res = await client.classifyMiloPreview({
        fileBase64: base64Payload,
        mimeType,
      });
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err instanceof SupportApiError ? err.message : "Classification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel panel--flush">
      <h2 className="panel__title">Milo classification (preview)</h2>
      <p className="muted">
        Upload an image or PDF to run the same Gemini classification as production. Files stay in browser memory only until you
        send a request; the API does not persist uploads.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="milo-classify-file" className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
          File
        </label>
        <input
          id="milo-classify-file"
          type="file"
          accept="image/*,application/pdf"
          onChange={onFileChange}
        />
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
          {loading ? "Classifying…" : "Run classification"}
        </button>
      </p>

      {error ? <div className="error">{error}</div> : null}

      {result ? (
        <div style={{ marginTop: "1rem" }}>
          <h3 className="panel-sub">Result</h3>
          <p>
            <strong>documentType:</strong>{" "}
            <code>{result.documentType}</code>
          </p>
          <p>
            <strong>confidence:</strong> {result.confidence}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>
            <strong>reasoning:</strong> {result.reasoning ?? "—"}
          </p>
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => setShowPrompt((s) => !s)}>
            {showPrompt ? "Hide" : "Show"} extraction prompt
          </button>
          {showPrompt ? (
            <pre
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                maxHeight: "18rem",
                overflow: "auto",
                fontSize: "0.8rem",
                background: "var(--panel-subtle, #1a1a1e)",
                borderRadius: "6px",
              }}
            >
              {result.extractionPrompt}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
