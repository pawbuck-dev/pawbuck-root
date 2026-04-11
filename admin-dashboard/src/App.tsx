import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type {
  SupportMetrics,
  SupportPetRow,
  SupportUserRow,
  SupportVaccinationRow,
} from "@/types/support";

const API_KEY_STORAGE = "pawbuck-admin-api-key";
const BASE_DEFAULT =
  import.meta.env.VITE_ADMIN_API_BASE?.replace(/\/$/, "") ?? "http://localhost:5289";

function formatDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return d.length === 10 ? d : "";
}

function formatUserCreated(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  return d.length === 10 ? d : iso;
}

export function App() {
  const [baseUrl, setBaseUrl] = useState(BASE_DEFAULT);
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(API_KEY_STORAGE) ?? "" : "",
  );
  const [banner, setBanner] = useState<string | null>(null);

  const client = useMemo(
    () => createSupportClient(baseUrl, () => apiKey),
    [baseUrl, apiKey],
  );

  useEffect(() => {
    window.localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey]);

  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setBanner(null);
    try {
      setMetrics(await client.getMetrics());
    } catch (e) {
      setMetrics(null);
      setBanner(e instanceof SupportApiError ? e.message : "Failed to load metrics");
    } finally {
      setMetricsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const [searchQ, setSearchQ] = useState("");
  const [users, setUsers] = useState<SupportUserRow[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userListSource, setUserListSource] = useState<
    "search" | "all" | "withPets" | "withHealth" | null
  >(null);
  const accountsPanelRef = useRef<HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<SupportUserRow | null>(null);

  const [pets, setPets] = useState<SupportPetRow[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPet, setSelectedPet] = useState<SupportPetRow | null>(null);

  const [vaccinations, setVaccinations] = useState<SupportVaccinationRow[]>([]);
  const [vacLoading, setVacLoading] = useState(false);

  const [vacName, setVacName] = useState("");
  const [vacDate, setVacDate] = useState("");
  const [vacNext, setVacNext] = useState("");
  const [vacClinic, setVacClinic] = useState("");
  const [vacNotes, setVacNotes] = useState("");

  const runSearch = useCallback(async () => {
    const q = searchQ.trim();
    if (!q) {
      setUsers([]);
      setUserListSource(null);
      return;
    }
    setUserLoading(true);
    setBanner(null);
    try {
      setUsers(await client.searchUsers(q));
      setUserListSource("search");
    } catch (e) {
      setUsers([]);
      setUserListSource(null);
      setBanner(e instanceof SupportApiError ? e.message : "User search failed");
    } finally {
      setUserLoading(false);
    }
  }, [client, searchQ]);

  const loadUsersFromMetric = useCallback(
    async (segment: "all" | "withPets" | "withHealth") => {
      setUserLoading(true);
      setBanner(null);
      setSearchQ("");
      setSelectedUser(null);
      setSelectedPet(null);
      setPets([]);
      setVaccinations([]);
      try {
        setUsers(await client.listUsers(segment));
        setUserListSource(segment);
        queueMicrotask(() =>
          accountsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      } catch (e) {
        setUsers([]);
        setUserListSource(null);
        setBanner(e instanceof SupportApiError ? e.message : "Failed to load user list");
      } finally {
        setUserLoading(false);
      }
    },
    [client],
  );

  const selectUser = async (u: SupportUserRow) => {
    setSelectedUser(u);
    setSelectedPet(null);
    setVaccinations([]);
    setPetsLoading(true);
    setBanner(null);
    try {
      setPets(await client.getPetsForUser(u.id));
    } catch (e) {
      setPets([]);
      setBanner(e instanceof SupportApiError ? e.message : "Failed to load pets");
    } finally {
      setPetsLoading(false);
    }
  };

  const selectPet = async (p: SupportPetRow) => {
    setSelectedPet(p);
    setVacLoading(true);
    setBanner(null);
    try {
      setVaccinations(await client.listVaccinations(p.id));
    } catch (e) {
      setVaccinations([]);
      setBanner(e instanceof SupportApiError ? e.message : "Failed to load vaccinations");
    } finally {
      setVacLoading(false);
    }
  };

  const submitNewVaccination = async () => {
    if (!selectedPet) return;
    const name = vacName.trim();
    if (!name || !vacDate) {
      setBanner("Name and date are required for a new vaccination.");
      return;
    }
    setBanner(null);
    try {
      await client.createVaccination(selectedPet.id, {
        name,
        date: vacDate,
        nextDueDate: vacNext || null,
        clinicName: vacClinic.trim() || null,
        notes: vacNotes.trim() || null,
        documentUrl: null,
      });
      setVacName("");
      setVacDate("");
      setVacNext("");
      setVacClinic("");
      setVacNotes("");
      setVaccinations(await client.listVaccinations(selectedPet.id));
      void loadMetrics();
    } catch (e) {
      setBanner(e instanceof SupportApiError ? e.message : "Create failed");
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <h1>PawBuck support</h1>
        <div className="field">
          <label htmlFor="base">API base URL</label>
          <input
            id="base"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value.replace(/\/$/, ""))}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="key">X-Admin-Api-Key</label>
          <input
            id="key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Optional in Development"
            autoComplete="off"
          />
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void loadMetrics()}>
          Refresh metrics
        </button>
      </header>

      {banner ? <div className="error">{banner}</div> : null}

      <p className="metrics-hint muted">
        Click a card to open the matching account list (up to 500). Use search below to filter by email.
      </p>
      <section className="metrics" aria-live="polite">
        <button
          type="button"
          className="metric metric--clickable"
          onClick={() => void loadUsersFromMetric("all")}
          disabled={userLoading || metricsLoading}
          aria-label="View list of all users"
        >
          <div className="label">Total users</div>
          <div className="value">
            {metricsLoading ? "…" : metrics?.totalUsers ?? "—"}
          </div>
          <span className="metric__action">Open list</span>
        </button>
        <button
          type="button"
          className="metric metric--clickable"
          onClick={() => void loadUsersFromMetric("withPets")}
          disabled={userLoading || metricsLoading}
          aria-label="View users who have at least one pet"
        >
          <div className="label">Users with a pet</div>
          <div className="value">
            {metricsLoading ? "…" : metrics?.usersWithPets ?? "—"}
          </div>
          <span className="metric__action">Open list</span>
        </button>
        <button
          type="button"
          className="metric metric--clickable"
          onClick={() => void loadUsersFromMetric("withHealth")}
          disabled={userLoading || metricsLoading}
          aria-label="View users with pet and health data"
        >
          <div className="label">Users with pet + health data</div>
          <div className="value">
            {metricsLoading ? "…" : metrics?.usersWithPetsAndHealthRecords ?? "—"}
          </div>
          <span className="metric__action">Open list</span>
        </button>
      </section>

      <div className="layout">
        <section className="panel" ref={accountsPanelRef} id="accounts-panel">
          <h2>Accounts</h2>
          {userListSource && userListSource !== "search" ? (
            <p className="list-source" role="status">
              Showing:{" "}
              <strong>
                {userListSource === "all"
                  ? "All users"
                  : userListSource === "withPets"
                    ? "Users with a pet"
                    : "Users with pet + health data"}
              </strong>
              <span className="muted"> (max 500, newest first)</span>
            </p>
          ) : null}
          <h3 className="panel-sub">Search by email</h3>
          <div className="search-row">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runSearch()}
              placeholder="Email (partial match)"
            />
            <button type="button" className="btn" onClick={() => void runSearch()} disabled={userLoading}>
              Search
            </button>
          </div>
          {userLoading && users.length === 0 ? (
            <p className="muted">Loading…</p>
          ) : users.length === 0 ? (
            <p className="muted">
              No results yet. Click a metric above or search by email.
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>User id</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`clickable ${selectedUser?.id === u.id ? "selected" : ""}`}
                      onClick={() => void selectUser(u)}
                    >
                      <td>{u.email ?? "—"}</td>
                      <td className="muted">{formatUserCreated(u.createdAt)}</td>
                      <td className="muted">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h2 style={{ marginTop: "1.25rem" }}>Pets</h2>
          {!selectedUser ? (
            <p className="muted">Select a user to load pets.</p>
          ) : petsLoading ? (
            <p className="muted">Loading pets…</p>
          ) : pets.length === 0 ? (
            <p className="muted">No pets for this account.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Breed</th>
                </tr>
              </thead>
              <tbody>
                {pets.map((p) => (
                  <tr
                    key={p.id}
                    className={`clickable ${selectedPet?.id === p.id ? "selected" : ""}`}
                    onClick={() => void selectPet(p)}
                  >
                    <td>{p.name}</td>
                    <td>{p.animalType}</td>
                    <td>{p.breed || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2>Vaccinations</h2>
          {!selectedPet ? (
            <p className="muted">Select a pet to view or add vaccinations.</p>
          ) : vacLoading ? (
            <p className="muted">Loading…</p>
          ) : (
            <>
              {vaccinations.length === 0 ? (
                <p className="muted">No vaccinations yet.</p>
              ) : (
                <div>
                  {vaccinations.map((v) => (
                    <VaccinationEditorCard
                      key={v.id}
                      row={v}
                      onSaved={async () => {
                        setVaccinations(await client.listVaccinations(selectedPet.id));
                        void loadMetrics();
                      }}
                      client={client}
                    />
                  ))}
                </div>
              )}

              <h2 style={{ marginTop: "1.25rem" }}>Add vaccination</h2>
              <div className="form-grid">
                <div className="row2">
                  <div className="field">
                    <label>Name</label>
                    <input value={vacName} onChange={(e) => setVacName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input type="date" value={vacDate} onChange={(e) => setVacDate(e.target.value)} />
                  </div>
                </div>
                <div className="row2">
                  <div className="field">
                    <label>Next due (optional)</label>
                    <input type="date" value={vacNext} onChange={(e) => setVacNext(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Clinic (optional)</label>
                    <input value={vacClinic} onChange={(e) => setVacClinic(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Notes (optional)</label>
                  <textarea value={vacNotes} onChange={(e) => setVacNotes(e.target.value)} />
                </div>
                <button type="button" className="btn" onClick={() => void submitNewVaccination()}>
                  Save vaccination
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function VaccinationEditorCard({
  row,
  client,
  onSaved,
}: {
  row: SupportVaccinationRow;
  client: ReturnType<typeof createSupportClient>;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [date, setDate] = useState(formatDateInput(row.date));
  const [nextDue, setNextDue] = useState(formatDateInput(row.nextDueDate));
  const [clinic, setClinic] = useState(row.clinicName ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setName(row.name);
      setDate(formatDateInput(row.date));
      setNextDue(formatDateInput(row.nextDueDate));
      setClinic(row.clinicName ?? "");
      setNotes(row.notes ?? "");
    }
  }, [row, editing]);

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      await client.updateVaccination(row.id, {
        name,
        date,
        nextDueDate: nextDue || null,
        clinicName: clinic.trim() || null,
        notes: notes.trim() || null,
      });
      setEditing(false);
      await onSaved();
    } catch (e) {
      setErr(e instanceof SupportApiError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vac-card">
      {editing ? (
        <div className="edit-inline">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <div className="row2">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Next due</label>
              <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
            </div>
          </div>
          <input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Clinic" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
          {err ? <span className="error" style={{ display: "block" }}>{err}</span> : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn" disabled={saving} onClick={() => void save()}>
              Save
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3>{row.name}</h3>
          <div className="muted">
            {formatDateInput(row.date) || row.date}
            {row.nextDueDate ? ` · next ${formatDateInput(row.nextDueDate)}` : ""}
          </div>
          {(row.clinicName || row.notes) ? (
            <div className="muted" style={{ marginTop: "0.35rem" }}>
              {[row.clinicName, row.notes].filter(Boolean).join(" · ")}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: "0.55rem" }}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}
