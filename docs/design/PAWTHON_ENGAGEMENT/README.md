# Pawthon engagement — design package

**Status:** Implemented in consumer app (May 2026)  
**Owner:** Product + consumer app  
**Last updated:** May 2026

This folder is the **complete design handoff** for Pawthon walk history, habits, countdown start, badges, notifications, and weekly challenge UX. Implementation should not start until design sign-off below.

---

## How to review

| Step | What to open |
|------|----------------|
| 1 | **Visual mockups** — open [`../pawthon-preview/index.html`](../pawthon-preview/index.html) in a browser (Chrome/Safari). Use the screen list on the left; toggle **Light / Dark** in the header. |
| 2 | **Written spec** — [`../PAWTHON_ENGAGEMENT_UI_SPEC.md`](../PAWTHON_ENGAGEMENT_UI_SPEC.md) (wireframes, copy, states, navigation, a11y). |
| 3 | **Components** — [`COMPONENTS.md`](./COMPONENTS.md) (props, variants, journal parity). |
| 4 | **Flows** — [`USER_FLOWS.md`](./USER_FLOWS.md) (Mermaid diagrams). |

**Quick open (from repo root):**

```bash
open docs/design/pawthon-preview/index.html
```

---

## Scope (6 phases — design only)

| Phase | Deliverable in mockups | Spec section |
|-------|------------------------|--------------|
| 1 | Home card, hub log preview, walk log, walk detail | History |
| 2 | Progress ring, streak banner, goal copy | Daily goal |
| 3 | Countdown overlay on map | Countdown |
| 4 | Badge grid, complete unlock | Badges |
| 5 | Reminders settings, notification copy | Notifications |
| 6 | Weekly detail, hub personal stats | Weekly |

---

## Design principles (match Pet Journal)

1. **Card-first** — 20px radius, subtle border, icon badge header, “View all” affordance.  
2. **Inset rows** — Last walk / last entry pattern (kicker → title → subtitle).  
3. **One primary CTA per card** — teal gradient for walk actions; theme primary for journal-adjacent actions.  
4. **Pawthon accent** — Sky gradient for home walk hero; cream for weekly; teal for maps and progress.  
5. **Dark mode parity** — Every screen in preview has light + dark tokens.

---

## Sign-off checklist

Before implementation, confirm:

- [ ] Home card layout (goal ring + last walk + dual CTAs)  
- [ ] Walk log list + detail map layout  
- [ ] Countdown timing (5→1 vs 3→1) and skip behavior  
- [ ] Badge set (12) names and unlock rules  
- [ ] Notification types and default times (6 PM reminder, 6 PM streak)  
- [ ] Weekly: personal stats always visible; social rank when >300 users  
- [ ] Open decisions in spec (goal default, delete walk, premium, household filter)  

**Approved by:** _______________ **Date:** _______________

---

## After sign-off → implementation

See implementation checklist in `PAWTHON_ENGAGEMENT_UI_SPEC.md` § “Implementation order”. Suggested build order: Phase 1 → 2 → 3 → 4 → 5 → 6.

Update Milo help (`docs/pawbuck-product-help/09-pawthon-walks.md`) when shipping owner-visible flows.
