import { useEffect, useState } from "react";
import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type { SupportPetExplorerRow } from "@/types/support";

type Props = {
  client: ReturnType<typeof createSupportClient>;
  onOpenHealthRecords: (pet: SupportPetExplorerRow) => void;
};

function healthBadgeClass(status: string): string {
  switch (status) {
    case "attention":
      return "badge badge--attention";
    case "good":
      return "badge badge--good";
    default:
      return "badge badge--minimal";
  }
}

function healthLabel(status: string): string {
  switch (status) {
    case "attention":
      return "Needs attention";
    case "good":
      return "Tracked";
    default:
      return "Minimal data";
  }
}

export function PetHealthExplorer({ client, onOpenHealthRecords }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<SupportPetExplorerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setRows([]);
      setError(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          setRows(await client.searchPets(s));
        } catch (e) {
          setRows([]);
          setError(e instanceof SupportApiError ? e.message : "Search failed");
        } finally {
          setLoading(false);
        }
      })();
    }, 350);
    return () => window.clearTimeout(t);
  }, [q, client]);

  return (
    <div className="pet-explorer">
      <div className="directory__toolbar">
        <input
          className="directory__search"
          placeholder="Pet name (min 2 characters)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search pets"
        />
      </div>
      {error ? <div className="error directory__err">{error}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && q.trim().length >= 2 && rows.length === 0 && !error ? (
        <p className="muted">No pets match.</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pet</th>
                <th>Type</th>
                <th>Owner email</th>
                <th>Health status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.animalType}</td>
                  <td className="muted">{p.ownerEmail ?? "—"}</td>
                  <td>
                    <span className={healthBadgeClass(p.healthStatus)}>{healthLabel(p.healthStatus)}</span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-link" onClick={() => onOpenHealthRecords(p)}>
                      Health records
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
