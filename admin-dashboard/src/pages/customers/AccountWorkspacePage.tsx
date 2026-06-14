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
  const [grantPlan, setGrantPlan] = useState<"individual" | "family" | "free">("individual");
  const [grantExpiresAt, setGrantExpiresAt] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [grantSaving, setGrantSaving] = useState(false);

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

  const reloadSubscription = useCallback(async () => {
    if (!userId) return;
    setSubscriptionLoading(true);
    try {
      setSubscription(await client.getUserSubscriptionStatus(userId));
    } catch {
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [client, userId]);

  const applyEntitlementGrant = async () => {
    if (!userId) return;
    const label =
      grantPlan === "free"
        ? "revoke complimentary access and set Free"
        : `grant ${grantPlan === "family" ? "Family" : "Individual"} access`;
    if (!window.confirm(`Apply for this user: ${label}?`)) return;

    setGrantSaving(true);
    setBanner(null);
    try {
      const expiresAt =
        grantPlan !== "free" && grantExpiresAt.trim()
          ? new Date(`${grantExpiresAt.trim()}T23:59:59Z`).toISOString()
          : null;
      const status = await client.setUserEntitlement(userId, {
        plan: grantPlan,
        expiresAt,
        note: grantNote.trim() || null,
      });
      setSubscription(status);
      setGrantNote("");
      void queryClient.invalidateQueries({ queryKey: supportQueryKeys.subscriptionPlanBreakdown() });
      setBanner(
        grantPlan === "free"
          ? "Subscription access revoked (Free)."
          : `Complimentary ${grantPlan} access applied.`,
      );
    } catch (e) {
      setBanner(e instanceof SupportApiError ? e.message : "Could not update entitlement");
    } finally {
      setGrantSaving(false);
    }
  };

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
                <>
                  <table>
                    <tbody>
                      <tr>
                        <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                          Stored plan
                        </th>
                        <td>{formatSubscriptionPlanLabel(subscription.plan, subscription.isFoundingMember)}</td>
                      </tr>
                      <tr>
                        <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                          Active plan
                        </th>
                        <td>
                          {formatSubscriptionPlanLabel(subscription.activePlan, subscription.isFoundingMember)}
                          {subscription.isAdminGrant ? (
                            <span className="muted" style={{ marginLeft: "0.5rem" }}>
                              (admin grant)
                            </span>
                          ) : null}
                        </td>
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
                      ) : subscription.isAdminGrant && subscription.activePlan !== "free" ? (
                        <tr>
                          <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                            Expires
                          </th>
                          <td>No expiry (until revoked)</td>
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
                      {subscription.subscriptionStatus ? (
                        <tr>
                          <th scope="row" style={{ textAlign: "left", paddingRight: "1rem" }}>
                            Status
                          </th>
                          <td className="muted" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}>
                            {subscription.subscriptionStatus}
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

                  <div className="panel-sub" style={{ marginTop: "1.25rem" }}>
                    <h4 style={{ margin: "0 0 0.5rem" }}>Grant complimentary access</h4>
                    <p className="muted text-sm" style={{ marginTop: 0 }}>
                      Sets <code>user_entitlements</code> with <code>admin_grant</code> (not App Store billing). User
                      may need to restart the app or pull to refresh Profile. Store purchases override admin grants on
                      renewal webhooks.
                    </p>
                    <div className="form-grid" style={{ marginTop: "0.75rem" }}>
                      <div className="field">
                        <label htmlFor="grant-plan">Plan</label>
                        <select
                          id="grant-plan"
                          value={grantPlan}
                          onChange={(e) => setGrantPlan(e.target.value as "individual" | "family" | "free")}
                        >
                          <option value="individual">Individual</option>
                          <option value="family">Family</option>
                          <option value="free">Free (revoke)</option>
                        </select>
                      </div>
                      {grantPlan !== "free" ? (
                        <div className="field">
                          <label htmlFor="grant-expires">Expires (optional)</label>
                          <input
                            id="grant-expires"
                            type="date"
                            value={grantExpiresAt}
                            onChange={(e) => setGrantExpiresAt(e.target.value)}
                          />
                        </div>
                      ) : null}
                      <div className="field">
                        <label htmlFor="grant-note">Internal note (optional)</label>
                        <input
                          id="grant-note"
                          value={grantNote}
                          onChange={(e) => setGrantNote(e.target.value)}
                          placeholder="e.g. beta partner, support goodwill"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn--sm"
                          disabled={grantSaving}
                          onClick={() => void applyEntitlementGrant()}
                        >
                          {grantSaving ? "Applying…" : "Apply"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn--sm"
                          disabled={subscriptionLoading}
                          onClick={() => void reloadSubscription()}
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                </>
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
