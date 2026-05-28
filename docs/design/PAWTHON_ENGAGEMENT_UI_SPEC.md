# Pawthon engagement — UI design spec

**Status:** Design (implementation phases 1–6) — **no app code yet**  
**Design package:** [`PAWTHON_ENGAGEMENT/README.md`](./PAWTHON_ENGAGEMENT/README.md)  
**Visual mockups:** [`pawthon-preview/index.html`](./pawthon-preview/index.html) (open in browser)  
**Audience:** Consumer app (`apps/consumer-app`)  
**Visual baseline:** `PetJournalHomeCard`, `DailyGoalWalkCard`, `PawthonHubContent`, `WeeklyChallengeCard`

This document defines screens, components, copy, and states for walk history, daily goals, countdown start, badges, notifications, and weekly challenge UX. Build against existing tokens in `constants/pawthonUi.ts` and journal surfaces in `components/petJournal/journalSurfaceTokens.ts`.

---

## Design system (reuse, don’t reinvent)

### Typography (Poppins — already in app)

| Role | Font | Size | Notes |
|------|------|------|-------|
| Screen title | `Poppins_700Bold` | 18 | Center or left per screen |
| Card title | `Poppins_600SemiBold` | 16–18 | Journal-style headers |
| Hero stat | `Poppins_700Bold` | 36 | Active walk distance only |
| Stat value | `Poppins_700Bold` | 22 | Hub tiles, detail stats |
| Kicker | `Poppins_600SemiBold` | 11 | `letterSpacing: 1.2`, uppercase |
| Body | `Poppins_500Medium` | 13–14 | Secondary copy |
| Meta | `Poppins_600SemiBold` | 11 | `LAST WALK · Tue 6:42 PM` |

### Color

| Token | Hex / value | Use |
|-------|-------------|-----|
| `PAWTHON_TEAL` | `#26C1C1` | CTAs, progress ring, map polyline |
| `PAWTHON_TEAL_DARK` | `#1FA8A8` | Gradient end (Start Walk buttons) |
| Sky gradient (walk cards) | Light: `#F5FAFF → #E3F2FD → #D6EBFA` | Home daily goal |
| Cream challenge | `#FFFDF8 → #FAF3E8` | Hub weekly hero |
| Streak flame | `#FF8A42` | Streak badge, at-risk alerts |
| Journal card bg | `isDark ? rgba(255,255,255,0.04) : #FFFFFF` | History rows, settings |
| Inset row | `journalSurfaceTokens.subduedBackground` | Last walk / list items |

### Card anatomy (match Pet Journal)

```
┌─────────────────────────────────────────────┐  borderRadius: 20
│ [40×40 icon badge]  Title          View all >│  padding: 16
│                                              │
│ ┌─────────────────────────────────────────┐  │  inset: borderRadius 14
│ │ KICKER · meta                           │  │  padding: 12
│ │ Primary line (bold)                     │  │
│ │ Secondary (muted)                       │  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ [ Primary CTA — full width, theme.primary ]  │
│                                              │
│ shortcut · shortcut · shortcut               │  optional toolbar row
└─────────────────────────────────────────────┘
```

### Shared components to add

| Component | Responsibility |
|-----------|----------------|
| `pawthonSurfaceTokens.ts` | Mirror `journalSurfaceTokens.ts` for walk cards |
| `PawthonHomeCard.tsx` | Evolved daily goal + last walk + progress (replaces/extends `DailyGoalWalkCard`) |
| `PawthonWalkHistoryCard.tsx` | Inset “last walk” row (journal last-entry pattern) |
| `PawthonWalkLogRow.tsx` | Single history list item with map thumb |
| `PawthonBadgeChip.tsx` | Earned / locked badge pill |
| `PawthonCountdownOverlay.tsx` | 5→1 + Go full-screen |
| `PawthonProgressRing.tsx` | SVG or `react-native-svg` ring on home card |

### Navigation map

```
Home
 ├── PawthonHomeCard → pawthon-walk (start)
 ├── PawthonHomeCard “View log” → pawthon/history
 └── WeeklyChallengeCard → pawthon (hub)

pawthon/ (hub)
 ├── Start a Walk → pawthon-walk
 ├── Walk log → pawthon/history
 ├── Badges → pawthon/badges
 └── Weekly detail → pawthon/weekly (optional)

pawthon/history
 └── tap row → pawthon/walk/[sessionId]

pawthon-walk (existing, extended phases)
 select → warmup → countdown → active → complete
 complete → badge toast → history CTA

Settings (or Profile)
 └── Walk reminders → pawthon/reminders
```

---

## Phase 1 — Walk history & route replay

### 1A. Home — “Last walk” inset (Journal-quality)

Evolves `DailyGoalWalkCard` hero variant: keep sky gradient + walker art; add journal-style content below the title block.

```
┌──────────────────────────────────────────────────────────┐
│  [flame] Daily goal          0.4 / 0.5 mi  ◔ 80%       │  progress ring right of badge
│                                                          │
│  Luna's Counting On You Today  🐾🐾                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [map thumb 56×56]  LAST WALK · Yesterday 6:12 PM   │  │  PawthonWalkHistoryCard
│  │                    0.62 mi · 18 min · View route > │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [  ▶  Start a Walk  ]          [ Walk log > ]           │  secondary text link
│                                        walker.png →      │
└──────────────────────────────────────────────────────────┘
```

**States**

| State | UI |
|-------|-----|
| No walks ever | Hide inset; copy: “First walk unlocks your route map.” |
| Goal met today | Badge: `Goal met` (teal border); ring full |
| Loading | Skeleton inset (gray rounded rect) |

**Props:** `petName`, `goalMeters`, `todayMeters`, `lastWalk`, `onStartWalk`, `onViewLog`, `onViewLastWalk`

### 1B. Pawthon hub — Walk log entry

Below the 3 stat tiles, add a journal-style section:

```
┌─────────────────────────────────────────────┐
│ [footsteps icon]  Walk log          See all > │
│ ┌─────────────────────────────────────────┐ │
│ │ [thumb]  Tue, May 27 · 0.48 mi · 14 min │ │  max 2 rows preview
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ [thumb]  Mon, May 26 · 0.31 mi · 9 min  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

Empty: “No walks logged yet — your routes appear here after each walk.”

### 1C. Screen: Walk log (`pawthon/history`)

**Header:** Back · **Walk log** · filter icon (pet picker sheet)

**Segments (chips):** `This week` | `30 days` | `All`

**List row** (`PawthonWalkLogRow`):

```
┌──────────────────────────────────────────────────────────┐
│ ┌────────┐  Wed, May 28 · 7:04 AM                          │
│ │  mini  │  Luna · 0.72 mi · 22 min · Pace 18:20          │  mini map: static polyline snapshot
│ │  map   │  [streak dot] Qualified for streak                │  optional teal dot if ≥80m day
│ └────────┘                                          >      │
└──────────────────────────────────────────────────────────┘
```

- Row height: ~88pt  
- Thumb: 64×64, `borderRadius: 12`, map snapshot or teal line on neutral bg  
- Swipe actions (v2): Share, Delete (confirm)

### 1D. Screen: Walk detail (`pawthon/walk/[id]`)

```
┌──────────────────────────────────────────────────────────┐
│  ←   Walk · Wed, May 28                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              [ Full-width map ~45% height ]              │  PawthonWalkMap, read-only
│              teal polyline, start/end pins               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Luna avatar]  Walk with Luna                           │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│  │ 0.72 mi │ │  22 min │ │ 18:20   │                     │  3 stat tiles (hub StatCard style)
│  │Distance │ │Duration │ │Pace     │                     │
│  └─────────┘ └─────────┘ └─────────┘                     │
│                                                          │
│  Started 7:04 AM · Ended 7:26 AM                         │
│                                                          │
│  [ Share route ]    [ Start similar walk ]               │  outline + primary secondary
└──────────────────────────────────────────────────────────┘
```

**Share sheet:** Map screenshot + stats (reuse complete-screen share pattern).

---

## Phase 2 — Real daily goal + streak on home & hub

### Goals model (UI only; settings later)

| Preset | Target | Streak rule (existing) |
|--------|--------|-------------------------|
| Short | 0.25 mi (402 m) | ≥80 m / day still counts streak |
| Standard (default) | 0.5 mi (805 m) | |
| Long | 1.0 mi | |

### Home card — progress ring

- Ring: 48×48, stroke `PAWTHON_TEAL`, track `theme.border`  
- Center text: `80%` or checkmark when ≥100%  
- Subtitle under title when in progress: `0.32 mi to go — you've got this`

### Hub — streak tile (4th stat or banner)

Option A — replace “Pets” with streak when single pet selected (not recommended).  
**Option B (recommended):** Full-width streak banner under stats:

```
┌──────────────────────────────────────────────────────────┐
│  🔥 5-day streak with Luna          Keep it going today > │
│      Walk 0.1 mi more to protect your streak              │  only if today < 80m
└──────────────────────────────────────────────────────────┘
```

- Background: `PAWTHON_PEACH_CARD` light / dark equivalent  
- Tap → `pawthon-walk` with pet preselected

### Copy matrix

| todayMeters | Copy |
|-------------|------|
| 0 | `Today's goal: 0.5 mi` |
| 1–79% of goal | `0.32 mi to go` |
| ≥100% goal, <80m streak | `Goal met! 0.05 mi more for streak` |
| ≥80m | `Streak safe · Goal met` |

---

## Phase 3 — Nike-style countdown (5, 4, 3, 2, 1, Go!)

Insert **after** warmup succeeds, **before** GPS tracking counts distance.

### Flow

```
warmup (GPS lock) → countdown overlay → active (tracking on)
```

### UI: `PawthonCountdownOverlay`

Full-screen over map (warmup map still visible, dimmed):

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    (map blurred/dim)                     │
│                                                          │
│                         3                                │  Poppins_700Bold 120pt
│                                                          │  color: #FFFFFF
│              Get ready — walk with Luna                  │  16pt, white 85%
│                                                          │
│              [ Skip countdown ]                          │  13pt link, bottom safe area
└──────────────────────────────────────────────────────────┘
```

**Sequence:** 5 → 4 → 3 → 2 → 1 → **Go!** (shorter: 3-2-1-Go if setting “Short countdown”)

| Beat | Haptic | Audio (off default) |
|------|--------|---------------------|
| Each number | `impactLight` | — |
| Go! | `impactMedium` | optional short tone |

**Go!** transition: number scales 1.2→0, overlay fades 300ms, bottom sheet slides up (active walk UI).

**Skip:** Persists in AsyncStorage `pawthon_skip_countdown`; still show once per install with tooltip.

**Settings** (Phase 5 screen): Toggle countdown, Short (3-2-1) vs Full (5-1).

---

## Phase 4 — Badges & post-walk celebration

### Badge grid screen (`pawthon/badges`)

```
┌──────────────────────────────────────────────────────────┐
│  ←   Badges                                              │
│                                                          │
│  6 of 12 earned                                          │
│  ████████░░░░  progress bar (teal)                       │
│                                                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                             │
│  │ 🐾 │ │ 🔒 │ │ ☀️ │ │ 🔒 │                             │  3-column grid
│  │First│ │ 7d │ │ AM │ │1 mi│                             │
│  │steps│ │strk│ │walk│ │club│                             │
│  └────┘ └────┘ └────┘ └────┘                             │
│                                                          │
│  Tap earned badge → bottom sheet with description + date │
└──────────────────────────────────────────────────────────┘
```

**Earned cell:** Teal ring, full-color icon, label below  
**Locked cell:** 40% opacity, lock icon overlay, “?” description in sheet

### Launch badge set (12)

| ID | Name | Icon (Ionicons) |
|----|------|-----------------|
| `first_walk` | First steps | `footsteps` |
| `streak_3` | On a roll | `flame` |
| `streak_7` | Week warrior | `calendar` |
| `mile_one` | Mile club | `ribbon` |
| `walks_10` | Explorer | `map` |
| `morning` | Early bird | `sunny` |
| `comeback` | Welcome back | `heart` |
| `multi_pet` | Pack leader | `paw` |
| `week_5mi` | Distance digger | `trending-up` |
| `photo` | Picture perfect | `camera` |
| `goal_week` | Goal getter | `checkmark-circle` |
| `rank_top10` | Top walker | `trophy` |

### Complete screen — badge unlock moment

After stats, before share:

```
┌──────────────────────────────────────────────────────────┐
│  ✨ Badge unlocked                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │     [large badge 80×80]   First steps               │  │  gradient peach→white
│  │     You logged Luna's first tracked walk!          │  │
│  └────────────────────────────────────────────────────┘  │
│  [ View all badges ]    [ Done ]                         │
└──────────────────────────────────────────────────────────┘
```

- Animate: scale 0.6→1.0 spring, 400ms  
- If multiple badges: horizontal pager “1 of 2”

Replace placeholder “Achievements” cards on complete screen with real earned + next-up (“2 more walks until Explorer”).

---

## Phase 5 — Notifications & reminders

### Settings screen (`pawthon/reminders`)

Journal-style card stack:

```
┌──────────────────────────────────────────────────────────┐
│  ←   Walk reminders                                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Daily walk reminder                        [toggle]│  │
│  │ Remind me at  [ 6:00 PM  v ]                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Streak protection                          [toggle]│  │
│  │ Nudge at 6 PM if you haven't walked today          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Weekly challenge digest                    [toggle]│  │
│  │ Monday 9 AM — your rank and distance               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Post-walk celebration                         [toggle]  │
│  (local notification after save — optional v2)           │
└──────────────────────────────────────────────────────────┘
```

### Push copy (respect quiet hours 10pm–8am local)

| Type | Title | Body |
|------|-------|------|
| Daily reminder | `Time for a walk?` | `Luna's ready — even 10 minutes counts.` |
| Streak at risk | `Keep your 5-day streak` | `Walk 0.1 mi before midnight to stay on track.` |
| Goal almost there | `Almost there` | `0.12 mi left on today's goal.` |
| Weekly Monday | `Your week in Pawthon` | `You walked 2.4 mi — #8 of 42 walkers.` |
| Post-walk | `Nice walk!` | `0.62 mi with Luna — streak now 6 days.` |

### In-app permission primer (first toggle on)

Modal matching “Pocket and screen-off walks” style:

- Title: **Stay on track with gentle reminders**  
- Body: Explain notifications are optional; link to Settings.  
- CTA: **Enable notifications** / Not now

---

## Phase 6 — Weekly challenge (personal first, social when ready)

### Hub weekly hero — always show personal stats

Even when `registeredUserCount ≤ 300`, show:

```
WEEKLY CHALLENGE
Your week
2.4 mi walked · 4 walks
Best day: Tue 0.9 mi
```

When social unlocked, add rank line: `#8 of 42 walkers` (existing `formatWeeklyWalkerRankLine`).

### Home `WeeklyChallengeCard` — wire real data

- Pass `weekKm`, `streakDays` (stop prefixing with `_`)  
- Subline: `2.4 km this week · 5-day streak`  
- Tap: hub (not dead leaderboard redirect)

### Screen: Weekly detail (`pawthon/weekly`) — optional

```
┌──────────────────────────────────────────────────────────┐
│  ←   This week                                           │
│                                                          │
│  [cream hero + trophy]                                     │
│  2.4 mi    Rank #8 of 42                                   │
│                                                          │
│  Mon ████░░ 0.4 mi                                       │  bar chart per day
│  Tue ██████ 0.9 mi                                       │
│  ...                                                     │
│                                                          │
│  [ Start a walk to climb the board ]                       │
└──────────────────────────────────────────────────────────┘
```

Remove “coming soon” from complete screen; link to this screen.

---

## `pawthon-walk.tsx` — phase updates (summary)

| Phase | Current | New |
|-------|---------|-----|
| select | Pet + map | Unchanged |
| warmup | GPS wait | Unchanged |
| **countdown** | — | **New overlay** |
| active | Map + sheet | Unchanged |
| complete | Stats + placeholders | Badge unlock + “View in walk log” CTA |

### Complete screen footer CTAs

```
[ Share ]  [ View in walk log ]  [ Done ]
```

---

## Implementation order & file checklist

| Phase | Screens / components | Routes |
|-------|---------------------|--------|
| 1 | `PawthonWalkLogRow`, history, detail, home inset | `pawthon/history`, `pawthon/walk/[id]` |
| 2 | `PawthonProgressRing`, hub streak banner | extend `PawthonHomeCard` |
| 3 | `PawthonCountdownOverlay` | `pawthon-walk` phase |
| 4 | `pawthon/badges`, unlock modal | badge service + table (v2) |
| 5 | `pawthon/reminders` | expo-notifications |
| 6 | Weekly detail, card data wiring | `pawthon/weekly` |

### Milo / docs (when shipping)

- Update `docs/pawbuck-product-help/09-pawthon-walks.md`  
- Add `productHelpStarters.ts`: “How do I see my past walks?”

---

## Accessibility

- All rows: `accessibilityLabel` with date, distance, pet name  
- Countdown: `accessibilityLiveRegion` announces numbers  
- Progress ring: `accessibilityValue` = percent  
- Badge grid: earned vs locked announced

---

## Figma handoff notes

1. **Frame size:** iPhone 15 Pro 393×852  
2. **Components:** Build library from Pet Journal card + Daily Goal card — same 20px radius, inset 14px  
3. **Export:** `walker.png` reused; new: badge icons (optional Lottie for unlock)  
4. **Dark mode:** Every screen needs dark variant (use existing `useTheme` patterns)  
5. **Prototype links:** Home → History → Detail; Walk complete → Badge → Log

---

## Open product decisions (pick before build)

1. **Daily goal default:** 0.5 mi vs 20 min?  
2. **Delete walk:** Allow user delete from history? (GDPR / mistakes)  
3. **Premium:** Gate badges or history behind premium? Recommendation: **free** for habit formation.  
4. **Household:** Show all pets’ walks in one log or filter only? Default: filter by selected pet, “All pets” in filter sheet.
