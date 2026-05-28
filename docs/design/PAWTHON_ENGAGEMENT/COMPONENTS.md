# Pawthon engagement — component library (design)

React Native component contracts for implementation. Visual reference: [`pawthon-preview/index.html`](../pawthon-preview/index.html).

**Surface tokens** (implement as `components/pawthon/pawthonSurfaceTokens.ts`, mirror journal):

| Token | Light | Dark |
|-------|-------|------|
| `cardBackground` | `#FFFFFF` | `rgba(255,255,255,0.04)` |
| `insetBackground` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |
| `iconBadgeBackground` | `rgba(59,208,210,0.18)` | `rgba(56,189,189,0.2)` |
| `borderColor` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |

---

## `PawthonHomeCard`

**Replaces / extends** `DailyGoalWalkCard` on Home.

| Prop | Type | Notes |
|------|------|-------|
| `petName` | string | Possessive copy |
| `goalMeters` | number | User goal (default 805 = 0.5 mi) |
| `todayMeters` | number | Sum today for pet |
| `streakDays` | number | Current streak |
| `lastWalk` | `WalkSessionSummary \| null` | For inset row |
| `onStartWalk` | () => void | Primary CTA |
| `onViewLog` | () => void | Text link |
| `onViewLastWalk` | () => void | Inset tap |
| `variant` | `'hero' \| 'compact'` | Home placement |

**Variants:** Hero (full sky gradient + walker art); Compact (shorter, no illustration).

**Child:** `PawthonProgressRing` (48px, percent, checkmark at 100%).

---

## `PawthonWalkHistoryCard`

Journal “last entry” row for walks.

| Prop | Type |
|------|------|
| `kicker` | string e.g. `LAST WALK · Yesterday 6:12 PM` |
| `title` | string e.g. `0.62 mi · 18 min` |
| `subtitle` | string e.g. `View route` |
| `mapThumbnailUri` | string? optional static map |
| `onPress` | () => void |

---

## `PawthonWalkLogRow`

History list cell. Height ~88pt.

| Prop | Type |
|------|------|
| `dateLabel` | string |
| `petName` | string |
| `distanceMi` | string |
| `durationLabel` | string |
| `paceLabel` | string? |
| `qualifiedStreak` | boolean |
| `onPress` | () => void |

---

## `PawthonProgressRing`

| Prop | Type |
|------|------|
| `progress` | number 0–1 |
| `size` | number default 48 |
| `label` | string? center text |

---

## `PawthonStreakBanner`

Hub full-width banner below stat tiles.

| Prop | Type |
|------|------|
| `petName` | string |
| `streakDays` | number |
| `metersToStreakSafe` | number 0 = safe |
| `onPress` | () => void |

---

## `PawthonCountdownOverlay`

Full-screen over map.

| Prop | Type |
|------|------|
| `petName` | string |
| `seconds` | number current digit |
| `phase` | `'number' \| 'go'` |
| `onSkip` | () => void |

---

## `PawthonBadgeCell`

| Prop | Type |
|------|------|
| `badgeId` | string |
| `name` | string |
| `icon` | Ionicons name |
| `earned` | boolean |
| `earnedAt` | string? |
| `onPress` | () => void |

---

## `PawthonHubWalkLogSection`

Journal-style section on hub: header + up to 2 `PawthonWalkLogRow` previews.

| Prop | Type |
|------|------|
| `walks` | `WalkSessionSummary[]` |
| `onSeeAll` | () => void |
| `onWalkPress` | (id) => void |

---

## Screens (routes) — no new components

| Route | Screen component |
|-------|------------------|
| `/(home)/pawthon/history` | `PawthonWalkLogScreen` |
| `/(home)/pawthon/walk/[id]` | `PawthonWalkDetailScreen` |
| `/(home)/pawthon/badges` | `PawthonBadgesScreen` |
| `/(home)/pawthon/reminders` | `PawthonRemindersScreen` |
| `/(home)/pawthon/weekly` | `PawthonWeeklyScreen` |

Extend existing: `pawthon-walk.tsx`, `PawthonHubContent.tsx`.

---

## Journal parity checklist

| Journal (`PetJournalHomeCard`) | Pawthon equivalent |
|----------------------------------|-------------------|
| Icon badge + title + View all | Walk log header on hub |
| Last entry inset | `PawthonWalkHistoryCard` on home |
| Primary CTA | Start a Walk (teal gradient) |
| Shortcut toolbar | Walk log link + optional “Badges” |
| Premium wrap | TBD — recommend walk features free |
