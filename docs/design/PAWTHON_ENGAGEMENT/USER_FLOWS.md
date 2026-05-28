# Pawthon engagement — user flows

Design-phase flows only. Implementation follows [`PAWTHON_ENGAGEMENT_UI_SPEC.md`](../PAWTHON_ENGAGEMENT_UI_SPEC.md).

---

## Primary habit loop

```mermaid
flowchart LR
  A[Home / Hub] --> B[Start walk]
  B --> C[GPS warmup]
  C --> D[Countdown 5-1-Go]
  D --> E[Active tracking]
  E --> F[Stop]
  F --> G[Complete + badge?]
  G --> H[Walk log]
  H --> A
```

---

## Discovery: past walks

```mermaid
flowchart TD
  H[Home Pawthon card] -->|View route| D[Walk detail]
  H -->|Walk log| L[Walk log list]
  Hub[Pawthon hub] -->|See all| L
  L -->|Tap row| D
  D -->|Share| S[Share sheet]
  D -->|Start similar| B[Start walk prefilled pet]
```

---

## First-time walker

```mermaid
sequenceDiagram
  participant U as User
  participant App
  participant OS as iOS/Android

  U->>App: Tap Start a Walk
  App->>OS: Foreground location
  App->>U: Background explainer modal
  U->>App: Continue
  App->>OS: Background location
  App->>U: Warmup GPS
  App->>U: Countdown
  App->>U: Active walk UI
```

---

## Notifications opt-in

```mermaid
flowchart TD
  R[Profile or Pawthon reminders] --> T{Toggle on}
  T -->|First time| P[Permission primer modal]
  P -->|Enable| OS[System permission]
  P -->|Not now| R
  T -->|Already granted| Save[Save schedule prefs]
  OS --> Save
```

---

## Badge unlock (post-walk)

```mermaid
flowchart TD
  C[Walk complete screen] --> Q{New badges?}
  Q -->|Yes| U[Badge unlock card]
  U --> V[View all badges]
  U --> Done[Done]
  Q -->|No| Stats[Stats + streak only]
  Stats --> Done
```

---

## Weekly challenge (data gating)

```mermaid
flowchart TD
  Home[WeeklyChallengeCard] --> Hub[Pawthon hub]
  Hub --> W{User count > 300?}
  W -->|Yes| Rank[Show rank line]
  W -->|No| Personal[Personal week stats only]
  Rank --> Weekly[Weekly detail screen]
  Personal --> Weekly
```

---

## Screen inventory (14 frames in preview)

| # | Screen | Phase |
|---|--------|-------|
| 1 | Home — Pawthon card | 1–2 |
| 2 | Pawthon hub | 1–2–6 |
| 3 | Walk log | 1 |
| 4 | Walk detail | 1 |
| 5 | Start walk — select pet | existing |
| 6 | GPS warmup | existing |
| 7 | Countdown overlay | 3 |
| 8 | Active walk | existing |
| 9 | Walk complete | 4 |
| 10 | Badge unlock | 4 |
| 11 | Badges grid | 4 |
| 12 | Reminders settings | 5 |
| 13 | Notification primer | 5 |
| 14 | Weekly detail | 6 |
