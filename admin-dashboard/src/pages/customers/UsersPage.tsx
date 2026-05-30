import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SupportApiError } from "@/api/supportClient";
import { UserDirectoryTable } from "@/components/UserDirectoryTable";
import { useAdminApp } from "@/context/AdminAppContext";
import type { SupportUserRow } from "@/types/support";
import { mapDirectoryUser } from "@/utils/adminApp";
import { PageHeader } from "@/ui/PageHeader";

export function UsersPage() {
  const navigate = useNavigate();
  const { client, setBanner } = useAdminApp();
  const [segmentUsers, setSegmentUsers] = useState<SupportUserRow[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentLabel, setSegmentLabel] = useState<string | null>(null);

  const openUser = useCallback(
    (u: SupportUserRow) => {
      navigate(`/customers/users/${u.id}`, { state: { user: u } });
    },
    [navigate],
  );

  const loadSegment = async (segment: "all" | "withPets" | "withHealth", label: string) => {
    setSegmentLoading(true);
    setBanner(null);
    try {
      setSegmentUsers(await client.listUsers(segment));
      setSegmentLabel(label);
    } catch (e) {
      setSegmentUsers([]);
      setSegmentLabel(null);
      setBanner(e instanceof SupportApiError ? e.message : "Failed to load list");
    } finally {
      setSegmentLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Users"
        description="Directory and cohort lists. Select a row to open the account workspace."
      />
      <section className="panel panel--flush">
        <p className="muted segment-hint">
          Quick lists:{" "}
          <button
            type="button"
            className="btn-linkish"
            disabled={segmentLoading}
            onClick={() => void loadSegment("all", "All users")}
          >
            All users
          </button>
          {" · "}
          <button
            type="button"
            className="btn-linkish"
            disabled={segmentLoading}
            onClick={() => void loadSegment("withPets", "Users with a pet")}
          >
            With a pet
          </button>
          {" · "}
          <button
            type="button"
            className="btn-linkish"
            disabled={segmentLoading}
            onClick={() => void loadSegment("withHealth", "Users with health data")}
          >
            With health data
          </button>
        </p>
        {segmentLabel ? (
          <p className="list-source" role="status">
            Segment: <strong>{segmentLabel}</strong> ({segmentUsers.length} loaded)
          </p>
        ) : null}
        {segmentLoading ? <p className="muted">Loading segment…</p> : null}
        {segmentUsers.length > 0 ? (
          <div className="table-scroll" style={{ marginBottom: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {segmentUsers.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => openUser(u)}>
                    <td>{u.email ?? "—"}</td>
                    <td className="muted">{(u.createdAt ?? "").slice(0, 10) || "—"}</td>
                    <td>
                      <button type="button" className="btn btn-secondary btn--sm">
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <UserDirectoryTable
          client={client}
          selectedId={null}
          onSelectUser={(row) => openUser(mapDirectoryUser(row))}
        />
      </section>
    </div>
  );
}
