import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { SupportApiError } from "@/api/supportClient";
import { VaccinationEditorCard } from "@/components/VaccinationEditorCard";
import { useAdminApp } from "@/context/AdminAppContext";
import { supportQueryKeys } from "@/hooks/supportQueries";
import { useQueryClient } from "@tanstack/react-query";
import type {
  SupportHealthTimelineEvent,
  SupportPetRow,
  SupportUserRow,
  SupportVaccinationRow,
  SubscriptionStatusResponse,
} from "@/types/support";
import { formatSubscriptionPlanLabel, placeholderUser } from "@/utils/adminApp";
import { PageHeader } from "@/ui/PageHeader";

type WorkspaceLocationState = {
  user?: SupportUserRow;
  openPetId?: string;
};

export function AccountWorkspacePage() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as WorkspaceLocationState;
  const { client, setBanner } = useAdminApp();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<SupportUserRow | null>(state.user ?? null);
  const [pets, setPets] = useState<SupportPetRow[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPet, setSelectedPet] = useState<SupportPetRow | null>(null);
  const [vaccinations, setVaccinations] = useState<SupportVaccinationRow[]>([]);
  const [vacLoading, setVacLoading] = useState(false);
  const [timeline, setTimeline] = useState<SupportHealthTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const [vacName, setVacName] = useState("");
  const [vacDate, setVacDate] = useState("");
  const [vacNext, setVacNext] = useState("");
  const [vacClinic, setVacClinic] = useState("");
  const [vacNotes, setVacNotes] = useState("");

  useEffect(() => {
    if (!userId) return;
    if (state.user) {
      setUser(state.user);
      return;
    }
    setUser(placeholderUser(userId));
  }, [userId, state.user]);

  const selectPet = useCallback(
    async (p: SupportPetRow) => {
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
    },
    [client, setBanner],
  );

  const loadPets = useCallback(async () => {
    if (!userId) return;
    setPetsLoading(true);
    setBanner(null);
    try {
      const list = await client.getPetsForUser(userId);
      setPets(list);
      const openId = state.openPetId;
      if (openId) {
        const match = list.find((p) => p.id === openId);
        if (match) await selectPet(match);
      }
    } catch (e) {
      setPets([]);
      setBanner(e instanceof SupportApiError ? e.message : "Failed to load pets");
    } finally {
      setPetsLoading(false);
    }
  }, [client, userId, setBanner, state.openPetId, selectPet]);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  useEffect(() => {
    if (!userId) {
      setTimeline([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setTimelineLoading(true);
      try {
        const rows = await client.getUserTimeline(userId);
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
  }, [client, userId]);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSubscriptionLoading(true);
      try {
        const status = await client.getUserSubscriptionStatus(userId);
        if (!cancelled) setSubscription(status);
      } catch {
        if (!cancelled) setSubscription(null);
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, userId]);

  const submitNewVaccination = async () => {
    if (!selectedPet || !userId) return;
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
      setTimeline(await client.getUserTimeline(userId));
      void queryClient.invalidateQueries({ queryKey: supportQueryKeys.all });
    } catch (e) {
      setBanner(e instanceof SupportApiError ? e.message : "Create failed");
    }
  };

  if (!userId) {
    return (
      <div className="page">
        <p className="muted">Missing user id.</p>
        <Link to="/customers/users">Back to users</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Account workspace"
        description="Timeline, pets, and vaccination support for one owner."
        actions={
          <Link to="/customers/users" className="btn btn-secondary btn--sm">
            All users
          </Link>
        }
      />

      <div className="layout layout--support">
        <section className="panel">
          <h3 className="panel-sub">Account</h3>
          {user ? (
            <>
              <p>
                <strong>{user.email ?? "Email unknown — open from Users search"}</strong>
                <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
                  {user.id}
                </span>
              </p>

              <h3 className="panel-sub">Subscription</h3>
              {subscriptionLoading ? (
                <p className="muted">Loading subscription…</p>
              ) : subscription ? (
                <table>
                  <tbody>
                    <tr>
                      <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                        Plan
                      </th>
                      <td>{formatSubscriptionPlanLabel(subscription.plan, subscription.isFoundingMember)}</td>
                    </tr>
                    {subscription.expiresAt ? (
                      <tr>
                        <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                          Expires
                        </th>
                        <td>{subscription.expiresAt.slice(0, 10)}</td>
                      </tr>
                    ) : subscription.isFoundingMember ? (
                      <tr>
                        <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                          Expires
                        </th>
                        <td>Lifetime (founding)</td>
                      </tr>
                    ) : null}
                    {subscription.productId ? (
                      <tr>
                        <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                          Product
                        </th>
                        <td className="muted" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}>
                          {subscription.productId}
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                        Documents
                      </th>
                      <td>
                        {subscription.documentCount}
                        {subscription.limits.maxDocuments != null
                          ? ` / ${subscription.limits.maxDocuments} cap`
                          : " (unlimited cap)"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                        Milo chats (month)
                      </th>
                      <td>
                        {subscription.usage.miloConversationsUsed}
                        {subscription.limits.maxMiloConversations != null
                          ? ` / ${subscription.limits.maxMiloConversations}`
                          : " (unlimited)"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                        AI journal entries
                      </th>
                      <td>
                        {subscription.usage.aiJournalEntriesUsed}
                        {subscription.limits.maxAiJournalEntries != null
                          ? ` / ${subscription.limits.maxAiJournalEntries}`
                          : " (unlimited)"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="muted">Could not load subscription status.</p>
              )}

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
                      <div className="timeline__time">
                        {(ev.occurredAt ?? "").slice(0, 16).replace("T", " ")}
                      </div>
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
          ) : null}
        </section>

        <section className="panel">
          <h3 className="panel-sub">Vaccinations</h3>
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
                        setTimeline(await client.getUserTimeline(userId));
                        void queryClient.invalidateQueries({ queryKey: supportQueryKeys.all });
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
    </div>
  );
}
