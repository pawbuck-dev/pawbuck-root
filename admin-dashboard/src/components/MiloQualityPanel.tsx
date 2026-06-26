import { Link } from "react-router-dom";
import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type { SupportMiloQualityOutcomeRow, SupportMiloQualityOverviewResponse } from "@/types/support";
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

function exclusiveEndIsoFromYmd(ymd: string): string {
  const [y, m, day] = ymd.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1, day + 1));
  return d.toISOString();
}

function formatUtc(iso: string): string {
  return iso.replace("T", " ").slice(0, 19);
}

function outcomeBadgeClass(outcome: string): string {
  if (outcome === "success") return "badge badge--good";
  if (outcome === "partial") return "badge badge--attention";
  return "badge badge--minimal";
}

function isVisionSurface(surface: string): boolean {
  return surface === "vision" || surface === "email_vault";
}

export function MiloQualityPanel({ client }: Props) {
  const [dateFrom, setDateFrom] = useState(() => startOfUtcDayYmd(30));
  const [dateTo, setDateTo] = useState(() => toYmd(new Date()));
  const [overview, setOverview] = useState<SupportMiloQualityOverviewResponse | null>(null);
  const [outcomes, setOutcomes] = useState<SupportMiloQualityOutcomeRow[]>([]);
  const [outcomeTotal, setOutcomeTotal] = useState(0);
  const [surfaceFilter, setSurfaceFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [failureFilter, setFailureFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromIso = useMemo(() => `${dateFrom}T00:00:00.000Z`, [dateFrom]);
  const toIso = useMemo(() => exclusiveEndIsoFromYmd(dateTo), [dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, rows] = await Promise.all([
        client.getMiloQualityOverview(fromIso, toIso),
        client.getMiloQualityOutcomes({
          from: fromIso,
          to: toIso,
          surface: surfaceFilter || undefined,
          outcome: outcomeFilter || undefined,
          failureCode: failureFilter || undefined,
          limit: 100,
        }),
      ]);
      setOverview(ov);
      setOutcomes(rows.items);
      setOutcomeTotal(rows.total);
    } catch (e) {
      setOverview(null);
      setOutcomes([]);
      setOutcomeTotal(0);
      setError(e instanceof SupportApiError ? e.message : "Failed to load Milo quality data.");
    } finally {
      setLoading(false);
    }
  }, [client, fromIso, toIso, surfaceFilter, outcomeFilter, failureFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (days: number) => {
    setDateFrom(startOfUtcDayYmd(days));
    setDateTo(toYmd(new Date()));
  };

  return (
    <section className="panel">
      <h2 className="panel__title">Milo quality ledger</h2>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Structured outcomes from chat, journal, and document vision (no message text). Apply the migration{" "}
        <code>20260626160000_milo_interaction_outcomes</code> before expecting rows.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1rem", alignItems: "center" }}>
        <label className="muted" style={{ fontSize: "0.85rem" }}>
          From{" "}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="muted" style={{ fontSize: "0.85rem" }}>
          To{" "}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset(7)}>
          7d
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset(30)}>
          30d
        </button>
        <button type="button" className="btn btn-primary btn-sm" disabled={loading} onClick={() => void load()}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {overview ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div className="stat-card">
              <div className="stat-card__label">Total</div>
              <div className="stat-card__value">{overview.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Success rate</div>
              <div className="stat-card__value">{overview.successRate}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Success</div>
              <div className="stat-card__value">{overview.successCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Partial</div>
              <div className="stat-card__value">{overview.partialCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Failed</div>
              <div className="stat-card__value">{overview.failedCount}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>By surface</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Surface</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.bySurface.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="muted">
                          No rows in range
                        </td>
                      </tr>
                    ) : (
                      overview.bySurface.map((row) => (
                        <tr key={row.key}>
                          <td>{row.key}</td>
                          <td>{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Top failure codes</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.topFailureCodes.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="muted">
                          None in range
                        </td>
                      </tr>
                    ) : (
                      overview.topFailureCodes.map((row) => (
                        <tr key={row.key}>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setFailureFilter(row.key)}
                            >
                              {row.key}
                            </button>
                          </td>
                          <td>{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Outcome drill-down ({outcomeTotal} matching)</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "0.75rem" }}>
        <select value={surfaceFilter} onChange={(e) => setSurfaceFilter(e.target.value)} aria-label="Surface filter">
          <option value="">All surfaces</option>
          <option value="chat">chat</option>
          <option value="journal">journal</option>
          <option value="vision">vision</option>
          <option value="email_vault">email_vault</option>
        </select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} aria-label="Outcome filter">
          <option value="">All outcomes</option>
          <option value="success">success</option>
          <option value="partial">partial</option>
          <option value="failed">failed</option>
        </select>
        <input
          type="text"
          placeholder="failure code"
          value={failureFilter}
          onChange={(e) => setFailureFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setSurfaceFilter("");
            setOutcomeFilter("");
            setFailureFilter("");
          }}
        >
          Clear filters
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>When (UTC)</th>
              <th>Surface</th>
              <th>Outcome</th>
              <th>Failure</th>
              <th>Pet</th>
              <th>Doc type</th>
              <th>Conf.</th>
              <th>Flags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {outcomes.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  {loading ? "Loading…" : "No outcomes in range."}
                </td>
              </tr>
            ) : (
              outcomes.map((row) => (
                <tr key={row.id}>
                  <td>{formatUtc(row.createdAt)}</td>
                  <td>{row.surface}</td>
                  <td>
                    <span className={outcomeBadgeClass(row.outcome)}>{row.outcome}</span>
                  </td>
                  <td>{row.failureCode ?? "—"}</td>
                  <td>{row.petId ? row.petId.slice(0, 8) : "—"}</td>
                  <td>{row.documentType ?? "—"}</td>
                  <td>{row.confidence != null ? row.confidence.toFixed(0) : "—"}</td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {[row.usedRag && "RAG", row.usedCurated && "curated", row.usedPetFacts && "facts"]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td>
                    {isVisionSurface(row.surface) && row.failureCode ? (
                      <Link to="/milo/classify" className="link">
                        Classify lab
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
