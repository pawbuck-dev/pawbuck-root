# PawBuck Admin Portal — ground-up redesign plan

**Status:** Implemented in `admin-dashboard` (May 2026) — routed sidebar shell, all five phases shipped in one release.  
**Canonical app:** [`admin-dashboard/`](../../admin-dashboard/) (Vite SPA → `PawBuck.API` `/api/support/*`)  
**Removed:** `apps/pawbuck-admin` Next scaffold (use `admin-dashboard` only). See [`admin-dashboard/README.md`](../../admin-dashboard/README.md).  
**Rules:** [`.cursor/rules/admin-support-portal.mdc`](../../.cursor/rules/admin-support-portal.mdc), [architecture boundaries](../../.cursor/rules/architecture-boundaries.mdc)

**Interactive overview:** open the [Admin Portal Redesign canvas](/Users/nagadityasarvadevabatla/.cursor/projects/Users-nagadityasarvadevabatla-Git-pawbuck-root/canvases/pawbuck-admin-portal-redesign.canvas.tsx) beside this chat in Cursor.

---

## Executive summary

The admin portal works but **feels piecemeal** because it grew as **nine horizontal tabs** with **no URL routing**, a **734-line `App.tsx`**, and **three separate email surfaces** that duplicate filters and mental models. Operators cannot bookmark a user, email, or queue state; support workflows are split across **Users**, **Pet health**, and **Support**.

The redesign keeps **Vite + React + support API** and reorganizes around **how support actually works**: land on **what needs attention**, drill into **one account workspace**, triage **email in one hub**, and tuck **Milo lab** and **product config** into clear sub-areas.

---

## Current state audit

### Architecture

| Aspect | Today | Pain |
|--------|--------|------|
| Navigation | `useState` tab in `App.tsx` | No deep links; refresh loses context |
| Layout | `max-width: 1200px` shell, top tabs | Cramped on wide monitors; tabs wrap |
| Styling | Single `index.css` (~900 lines) | No tokens/components; inline styles in panels |
| State | Local component state + one global error | No shared query cache; duplicate date helpers |
| Tables | `@tanstack/react-table` only on Users | Inconsistent list/detail patterns |
| Tests | Minimal (`EmailHealthPanels`, placeholder) | Regressions likely on refactors |

### Feature map (today)

| Tab | Primary components | Operator job |
|-----|-------------------|--------------|
| Overview | `DashboardOverview`, `DocumentSyncAdminPanel` | Glance metrics |
| Users | `UserDirectoryTable` | Find accounts |
| Pet health | `PetHealthExplorer` | Inspect pet records |
| Support | **Inline in `App.tsx`** | Account drill-down, vaccinations |
| Mail errors | `ProcessedEmailsPanel` (~889 LOC) | Failed / stuck emails |
| Email ops | `EmailOpsPanel` | Bulk / operational actions |
| Processing | `DocumentProcessingMetricsPanel` | Pipeline health |
| Milo | Journal, ADR, classify harness (stacked) | AI tuning |
| Settings | Feature gates, verification, sync | Product config |

### Root causes of “badly organized”

1. **Tabs mirror build order**, not task flow (email split three ways; Support depends on selection from other tabs).
2. **No product IA document** — only ops UAT (`EMAIL-PROCESSING-UAT.md`, `EMAIL-OPS-DEPLOY.md`).
3. **God component** — Support and vaccination CRUD live in `App.tsx` instead of routable pages.
4. **Inconsistent UI kit** — one panel is a mini-app with inline styles; others use shared CSS classes.
5. **Overview is passive** — metrics don’t route to actionable queues.

---

## Design goals

1. **Task-first navigation** — grouped sidebar, not nine peer tabs.
2. **Bookmarkable everything** — user id, pet id, email id, filter query in URL.
3. **One account workspace** — timeline, pets, support actions, vaccinations in one place.
4. **One email hub** — inbox queue + metrics + ops as sub-views, shared filters.
5. **Shared admin UI** — tables, filters, detail drawer, empty/error states.
6. **Parity with consumer** — support sees what owners see (per admin-support-portal rule).
7. **Incremental migration** — ship phases without a big-bang rewrite.

---

## Proposed information architecture

```
Home
└── Command center          (/home) — queues, alerts, global search

Customers
├── Users                   (/customers/users)
├── Pets                    (/customers/pets)
└── Account workspace       (/customers/users/:userId) — replaces Support tab

Email pipeline
├── Review inbox            (/email/inbox) — primary triage
├── Processing health       (/email/health) — metrics (today Processing tab)
└── Email operations        (/email/ops) — bulk tools (today Email ops)

AI / Milo
├── Journal & chat          (/milo/journal)
├── Classify lab            (/milo/classify)
└── Medication ADR          (/milo/adr)

Product
├── Feature gates           (/product/gates)
├── Verification rules      (/product/verification)
└── Document sync           (/product/document-sync)
```

### Command center (new emphasis)

Replace passive Overview with **actionable cards**:

- Emails needing review (count → `/email/inbox?status=needs_review`)
- Mail errors / DLQ (→ inbox filtered)
- Stuck document processing (→ `/email/health`)
- Recent support escalations (→ account workspace list)

Optional v2: global search (user email, pet id, message id).

### Account workspace (critical merge)

**Problem:** Support tab is a second-class citizen; vaccinations and account tools are in `App.tsx`.

**Solution:** When an operator opens a user (from Users, search, or email row), navigate to `/customers/users/:id` with:

| Zone | Content |
|------|---------|
| Header | Email, created, segment, feature flags summary |
| Left | Activity timeline (emails, logins, exports, support notes) |
| Main | Pets list → link to pet detail / `PetHealthExplorer` embedded |
| Actions | Vaccination CRUD, account actions (existing API), link to consumer parity preview |

Pet-only deep work stays at `/customers/pets/:petId` for health explorer power users.

### Email pipeline hub

**Problem:** Mail errors, Email ops, and Processing are three tabs with overlapping concepts.

**Solution:**

- **Review inbox** — primary `ProcessedEmailsPanel` UX: list + **right detail drawer** (consumer parity, archive status, recommended action, reprocess).
- **Processing health** — `DocumentProcessingMetricsPanel` + charts.
- **Email operations** — `EmailOpsPanel` bulk actions; require confirmation modals.

Shared: `FilterBar` (date range, owner, status, clinic), persisted in URL query string.

### Milo & Product

Split stacked Milo panels into **sub-routes** with consistent page chrome (`PageHeader`, description, last-run stats).

Product tab becomes **Product** group — gates, verification, document sync are **config**, not daily ops (lower in sidebar).

---

## Shell & visual design (high level)

See canvas wireframes. Principles:

- **Full-width** app shell; content areas use max-width only for reading-heavy forms.
- **Left sidebar** (240px), collapsible on narrow viewports.
- **Top bar:** environment badge (prod/staging), signed-in admin, global error **toast** stack (not single banner).
- **Detail drawer** (320–400px) for list rows — avoid full-page navigation for email triage.
- **Design tokens:** align with PawBuck consumer neutrals + accent blue (reuse or import shared tokens when available).

**Do not** copy consumer marketing chrome — this is a **dense ops tool** (Stripe Dashboard / Linear-style density).

---

## Technical plan

### Phase 1 — Foundation (2–3 weeks)

| Task | Detail |
|------|--------|
| Add router | `react-router-dom` v7; lazy route chunks per area |
| App shell | `AdminLayout`: Sidebar, TopBar, `<Outlet />` |
| Design system starter | `admin-dashboard/src/ui/`: `PageHeader`, `FilterBar`, `DataTable`, `DetailDrawer`, `MetricCard`, `EmptyState` |
| CSS strategy | Tailwind **or** CSS modules + tokens; stop growing monolithic `index.css` |
| Server state | TanStack Query wrapping `supportClient` methods |
| Auth guard | Route loader checks session + `app_metadata.role` |
| Docs | This file + route map in README |

**Exit criteria:** Any tab reachable via URL; refresh preserves route; no behavior change yet.

### Phase 2 — Customers (2 weeks)

| Task | Detail |
|------|--------|
| Extract Support from `App.tsx` | `AccountWorkspacePage.tsx` + hooks |
| User list | Keep `UserDirectoryTable`; row click → workspace route |
| Pet health | Route `/customers/pets`; deep link from workspace |
| Vaccination CRUD | Move to workspace or pet sub-panel |
| Tests | Page-level tests with mocked `supportClient` |

**Exit criteria:** Support tab removed; all account flows via workspace URL.

### Phase 3 — Email hub (2–3 weeks)

| Task | Detail |
|------|--------|
| Split `ProcessedEmailsPanel` | `InboxList`, `InboxDetailDrawer`, `inboxFilters.ts` |
| Unify filters | Shared hook + URL sync across inbox/health/ops |
| Metrics sub-route | Move `DocumentProcessingMetricsPanel` |
| Ops sub-route | Move `EmailOpsPanel` with guardrails |
| Command center links | Overview cards deep-link into filtered inbox |

**Exit criteria:** Three old email tabs → one sidebar group; UAT doc updated.

### Phase 4 — Milo & Product (1–2 weeks)

| Task | Detail |
|------|--------|
| Sub-routes | One panel per route |
| Settings rename | Sidebar label **Product** |
| Consistent layout | All use `PageHeader` + `Card` grid |

### Phase 5 — Command center & polish (2 weeks)

| Task | Detail |
|------|--------|
| Queue API | Optional: `GET /api/support/queues/summary` (aggregate counts server-side) |
| Global search | v1 client-side from recent users; v2 API |
| Accessibility | Focus trap in drawer, keyboard nav in tables |
| E2E smoke | Playwright: login → inbox → open row → workspace |
| Remove `apps/pawbuck-admin` stub | Done — see `admin-dashboard/README.md` |

---

## API & backend (minimal changes)

Prefer **no new endpoints** for Phase 1–4 — compose existing support APIs in the client.

**Optional (Phase 5):**

```http
GET /api/support/queues/summary
```

Returns counts for command center (inbox, errors, processing lag) to avoid N+1 client fetches.

Align new diagnostics with admin-support-portal rule: **detail panel shows consumer parity fields**.

---

## Testing & quality

| Layer | Approach |
|-------|----------|
| Unit | Extract filter/sort/formatters from panels → `__tests__/` |
| Component | React Testing Library + mocked QueryClient |
| Integration | Critical paths: workspace load, inbox filter URL, reprocess action |
| CI | `pnpm --filter pawbuck-admin-dashboard test` in PRs touching admin |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Big-bang rewrite | Phased routes; keep old tab switch behind feature flag for one release |
| Operator retraining | Sidebar labels + 1-page “what moved” doc |
| Panel regressions | Characterization tests before splitting `ProcessedEmailsPanel` |
| Scope creep | Explicit out-of-scope: booking admin, marketplace provider UI |

---

## Success metrics

- Time to triage one stuck email (baseline vs after inbox drawer)
- % support sessions using shared URLs (analytics optional)
- Lines in `App.tsx` &lt; 150 (shell only)
- Test file count &gt; 10 meaningful specs

---

## Route map (implemented)

| Path | Page |
|------|------|
| `/home` | Command center + global search + metrics |
| `/customers/users` | User directory |
| `/customers/users/:userId` | Account workspace |
| `/customers/pets` | Pet health explorer |
| `/email/inbox?owner=` | Review inbox |
| `/email/health` | Processing health |
| `/email/ops` | Email operations |
| `/milo/journal` | Journal & chat |
| `/milo/classify` | Classify lab |
| `/milo/adr` | Medication ADR |
| `/product/gates` | Feature gates |
| `/product/verification` | Verification rules |
| `/product/document-sync` | Document sync |

Run locally: `pnpm --filter pawbuck-admin-dashboard dev` (port 5173).

## Also shipped (post–five-phase pass)

- `GET /api/support/queues/summary` — sidebar badges + command center counts
- TanStack Query for metrics and queue summary
- Tailwind CSS v4 on admin shell (sidebar, layout, command center)
- `apps/pawbuck-admin` removed; `admin-dashboard/README.md` is canonical
- `docs/EMAIL-PROCESSING-UAT.md` updated with admin routes

---

## Appendix: file targets (Phase 1)

```
admin-dashboard/src/
  routes.tsx
  layouts/AdminLayout.tsx
  pages/
    CommandCenterPage.tsx
    customers/UsersPage.tsx
    customers/AccountWorkspacePage.tsx
    email/InboxPage.tsx
    ...
  ui/   # design system primitives
  hooks/useSupportQuery.ts
```

`App.tsx` becomes: `QueryClientProvider` → `RouterProvider` → routes only.
