import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupportClient, normalizePawbuckApiBase, SupportApiError } from "@/api/supportClient";
import { AdminHeaderBar } from "@/components/AdminHeaderBar";
import { AdminLoginScreen } from "@/components/AdminLoginScreen";
import { DashboardOverview } from "@/components/DashboardOverview";
import { PetHealthExplorer } from "@/components/PetHealthExplorer";
import { UserDirectoryTable } from "@/components/UserDirectoryTable";
import { isSupabaseConfigured, supabase } from "@/supabaseClient";
import type {
  SupportHealthTimelineEvent,
  SupportMetrics,
  SupportPetExplorerRow,
  SupportPetRow,
  SupportUserDirectoryRow,
  SupportUserRow,
  SupportVaccinationRow,
} from "@/types/support";

/** Empty env var is "" (not undefined) — would make fetch use relative URLs on CloudFront → 403 on /api/*. */
function resolveAdminApiBase(): string {
  const raw = (import.meta.env.VITE_ADMIN_API_BASE ?? "").trim();
  if (!raw) return "http://localhost:5289";
  return normalizePawbuckApiBase(raw);
}

const BASE_DEFAULT = resolveAdminApiBase();

function isBrowserMixedContentApi(adminPageHttps: boolean, apiBase: string): boolean {
  if (!adminPageHttps) return false;
  return apiBase.trim().toLowerCase().startsWith("http://");
}

function formatDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return d.length === 10 ? d : "";
}

function mapDirectoryUser(u: SupportUserDirectoryRow): SupportUserRow {
  return { id: u.id, email: u.email, createdAt: u.createdAt };
}

export function App() {
  const [baseUrl, setBaseUrl] = useState(BASE_DEFAULT);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [banner, setBanner] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "pets" | "support">("overview");

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setAuthReady(true);
      return;
    }
    void supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
      })
      .finally(() => {
        setAuthReady(true);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const client = useMemo(
    () => createSupportClient(baseUrl, () => session?.access_token ?? ""),
    [baseUrl, session],
  );

  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setBanner(null);
    try {
      setMetrics(await client.getMetrics());
    } catch (e) {
      setMetrics(null);
      const httpsAdmin =
        typeof window !== "undefined" && window.location.protocol === "https:";
      if (e instanceof SupportApiError) {
        setBanner(e.message);
      } else if (isBrowserMixedContentApi(httpsAdmin, baseUrl)) {
        setBanner(
          "Browser blocked the request: this admin page is HTTPS but the API URL is HTTP (mixed content). Point the API field to an https:// URL (TLS on the load balancer or API behind CloudFront), or run the admin locally over HTTP for development.",
        );
      } else {
        setBanner(e instanceof Error && e.message ? e.message : "Failed to load metrics");
      }
    } finally {
      setMetricsLoading(false);
    }
  }, [client, baseUrl]);

  useEffect(() => {
    if (!authReady) return;
    if (isSupabaseConfigured && !session) return;
    void loadMetrics();
  }, [loadMetrics, authReady, isSupabaseConfigured, session]);

  const [selectedUser, setSelectedUser] = useState<SupportUserRow | null>(null);
  const [pets, setPets] = useState<SupportPetRow[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPet, setSelectedPet] = useState<SupportPetRow | null>(null);
  const [vaccinations, setVaccinations] = useState<SupportVaccinationRow[]>([]);
  const [vacLoading, setVacLoading] = useState(false);
  const [timeline, setTimeline] = useState<SupportHealthTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [vacName, setVacName] = useState("");
  const [vacDate, setVacDate] = useState("");
  const [vacNext, setVacNext] = useState("");
  const [vacClinic, setVacClinic] = useState("");
  const [vacNotes, setVacNotes] = useState("");

  const [segmentUsers, setSegmentUsers] = useState<SupportUserRow[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentLabel, setSegmentLabel] = useState<string | null>(null);

  const selectUser = useCallback(
    async (u: SupportUserRow) => {
      setSelectedUser(u);
      setSelectedPet(null);
      setVaccinations([]);
      setTimeline([]);
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
    },
    [client],
  );

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

  useEffect(() => {
    if (!selectedUser) {
      setTimeline([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setTimelineLoading(true);
      try {
        const rows = await client.getUserTimeline(selectedUser.id);
        if (!cancelled) setTimeline(rows);
      } catch {
        if (!cancelled) setTimeline([]);
      } finally {
        if (!cancelled) setTimelineLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, selectedUser]);

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

  const openPetFromExplorer = async (pet: SupportPetExplorerRow) => {
    setTab("support");
    const u: SupportUserRow = {
      id: pet.userId,
      email: pet.ownerEmail,
      createdAt: null,
    };
    await selectUser(u);
    setPetsLoading(true);
    try {
      const list = await client.getPetsForUser(pet.userId);
      setPets(list);
      const match = list.find((x) => x.id === pet.id);
      if (match) await selectPet(match);
    } catch (e) {
      setBanner(e instanceof SupportApiError ? e.message : "Failed to open pet");
    } finally {
      setPetsLoading(false);
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
      if (selectedUser) {
        setTimeline(await client.getUserTimeline(selectedUser.id));
      }
      void loadMetrics();
    } catch (e) {
      setBanner(e instanceof SupportApiError ? e.message : "Create failed");
    }
  };

  if (!authReady) {
    return (
      <div className="login-screen login-screen--loading">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <AdminLoginScreen />;
  }

  return (
    <div className="shell shell--admin">
           <AdminHeaderBar
        baseUrl={baseUrl}
        onBaseUrlChange={setBaseUrl}
        session={session}
        onRefresh={() => void loadMetrics()}
      />

      {typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      isBrowserMixedContentApi(true, baseUrl) ? (
        <div className="banner-warn" role="status">
          <strong>Mixed content:</strong> this page is loaded over HTTPS, so the browser will not call an{" "}
          <code>http://</code> API. Set <strong>VITE_ADMIN_API_BASE</strong> to an <code>https://</code> API origin when
          you deploy the admin to CloudFront, or terminate TLS on your load balancer.
        </div>
      ) : null}

      <nav className="nav-tabs" aria-label="Main">
        <button
          type="button"
          className={tab === "overview" ? "nav-tabs__btn nav-tabs__btn--active" : "nav-tabs__btn"}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={tab === "users" ? "nav-tabs__btn nav-tabs__btn--active" : "nav-tabs__btn"}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          type="button"
          className={tab === "pets" ? "nav-tabs__btn nav-tabs__btn--active" : "nav-tabs__btn"}
          onClick={() => setTab("pets")}
        >
          Pet health
        </button>
        <button
          type="button"
          className={tab === "support" ? "nav-tabs__btn nav-tabs__btn--active" : "nav-tabs__btn"}
          onClick={() => setTab("support")}
        >
          Support
        </button>
      </nav>

      {banner ? <div className="error">{banner}</div> : null}

      {tab === "overview" ? (
        <DashboardOverview metrics={metrics} loading={metricsLoading} />
      ) : null}

      {tab === "users" ? (
        <section className="panel panel--flush">
          <h2 className="panel__title">User directory</h2>
          <p className="muted segment-hint">
            Quick lists:{" "}
            <button type="button" className="btn-linkish" disabled={segmentLoading} onClick={() => void loadSegment("all", "All users")}>
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
              Segment: <strong>{segmentLabel}</strong> ({segmentUsers.length} loaded) — click a row to open in Support.
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
                    <tr
                      key={u.id}
                      className={`clickable ${selectedUser?.id === u.id ? "selected" : ""}`}
                      onClick={() => {
                        void selectUser(u);
                        setTab("support");
                      }}
                    >
                      <td>{u.email ?? "—"}</td>
                      <td className="muted">{(u.createdAt ?? "").slice(0, 10) || "—"}</td>
                      <td>
                        <button type="button" className="btn btn-secondary btn--sm">
                          Support
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
            selectedId={selectedUser?.id ?? null}
            onSelectUser={(row) => {
              void selectUser(mapDirectoryUser(row));
              setTab("support");
            }}
          />
        </section>
      ) : null}

      {tab === "pets" ? (
        <section className="panel panel--flush">
          <h2 className="panel__title">Pet health explorer</h2>
          <PetHealthExplorer client={client} onOpenHealthRecords={(p) => void openPetFromExplorer(p)} />
        </section>
      ) : null}

      {tab === "support" ? (
        <div className="layout layout--support">
          <section className="panel">
            <h2 className="panel__title">Account</h2>
            {!selectedUser ? (
              <p className="muted">Choose a user from the Users tab or Pet health tab.</p>
            ) : (
              <>
                <p>
                  <strong>{selectedUser.email ?? "—"}</strong>
                  <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
                    {selectedUser.id}
                  </span>
                </p>
                <h3 className="panel-sub">Pets</h3>
                {petsLoading ? (
                  <p className="muted">Loading pets…</p>
                ) : pets.length === 0 ? (
                  <p className="muted">No pets.</p>
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

                <h3 className="panel-sub">Health activity timeline</h3>
                {timelineLoading ? (
                  <p className="muted">Loading timeline…</p>
                ) : timeline.length === 0 ? (
                  <p className="muted">No health events yet.</p>
                ) : (
                  <ul className="timeline">
                    {timeline.map((ev) => (
                      <li key={`${ev.eventType}-${ev.relatedId}-${ev.occurredAt}`} className="timeline__item">
                        <div className="timeline__time">{(ev.occurredAt ?? "").slice(0, 16).replace("T", " ")}</div>
                        <div className="timeline__body">
                          <span className="timeline__badge">{ev.eventType}</span> {ev.title}
                          <div className="muted timeline__pet">
                            {ev.petName} · {ev.petId.slice(0, 8)}…
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <section className="panel">
            <h2 className="panel__title">Vaccinations</h2>
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
                          if (selectedUser) setTimeline(await client.getUserTimeline(selectedUser.id));
                          void loadMetrics();
                        }}
                        client={client}
                      />
                    ))}
                  </div>
                )}

                <h3 className="panel-sub" style={{ marginTop: "1rem" }}>
                  Add vaccination
                </h3>
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
      ) : null}
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
          {err ? (
            <span className="error" style={{ display: "block" }}>
              {err}
            </span>
          ) : null}
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
          {row.clinicName || row.notes ? (
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
