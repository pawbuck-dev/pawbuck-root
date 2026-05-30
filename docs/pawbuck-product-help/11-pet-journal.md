# Pet journal

## What the journal is for

The **Pet journal** captures owner observations: health notes, behavior, environment, and optional **briefing** style summaries. It complements structured health records (vaccines, labs).

## Adding an entry

From **Home**, use the **Pet Journal** row ("Log health, behavior & environment") or open **Pet Journal** from navigation you already use. The **Health briefing** card on Home opens the **briefing** flow for that pet when available.

Tap **new** or **add** to create an entry, pick a domain (for example **health**), subtype, date, and note text. Save the entry.

## Allergies and conditions

Dedicated flows exist for **add allergy** and **add condition** from the journal area—use those for long-lived conditions so they appear consistently in pet context.

## Behavior baseline ("normal for this pet")

The journal screen shows a **Set behavior baseline** row near the top (it switches to **Behavior baseline saved** once you finish it). Tapping it opens a short, six-question setup that captures **what's normal** for your pet across:

- **Energy** — a 1–5 cruising-speed scale (couch potato → always on the move).
- **Social disposition** — social butterfly, indifferent, or selective with people / other pets.
- **Food motivation** — high, normal, or finicky.
- **Sleep** — typical deep-sleep hours, restfulness (restful / restless / mixed), and a safe spot.
- **Vocalization** — quiet, occasional alerts, or very talkative.
- **Top 3 mood changers** — stress triggers like thunderstorms, fireworks, vet visits, strangers (capped at 3).

Saving stores one baseline per pet. PawBuck and Milo use this to **notice changes vs usual** when you log a journal entry (for example, "skipped two meals" reads differently for a high-food-motivation dog than a finicky one). You can update the baseline any time; if a pet is transferred to another household, the baseline travels with the pet and the new owner can review or reset it.

## Milo journal mode

When you open **Milo** for a journal check-in, the assistant runs a short **structured interview**. It introduces itself as **Milo AI** (or **Milo**) only when your **pet's name is Milo**; otherwise it uses **PawBuck's journal helper**.

### Tree-driven interviews (v1.5, when enabled)

1. **Context surfacing** — Milo shows what it already knows from your pet's record (vaccines, meds, prior notes) and any medication flags. Tap **Looks right — continue** to start questions.
2. **Clinical questions** (about 4–6) — Topic-specific chips (e.g. vomiting: timing, what it looks like, appetite, triggers).
3. **Structured summary** — SOAP-style fields you can review and edit before save.
4. **Share with vet** — Teal action to email your vet with an ask (FYI / please advise / urgent).

## Veterinary Summary PDF

From **Health Briefing** (or **Health Records** hub), tap **Download Veterinary Summary** to generate a 4-page PDF aligned with PawBuck’s vet summary format: clinical snapshot, vaccines, timeline, and insurance/behavior appendix when data exists. Valid for 14 days from generation.

Enable via admin **Milo journal** settings: **tree-driven journal interviews**. The app also respects `EXPO_PUBLIC_JOURNAL_TREE_INTERVIEW=true` for early testing.

### Legacy checklist mode (fallback)

If tree mode is off, the interview follows **five phases**: frame, symptom detail, contextual scan, red-flag screen, confirm.

- Each step offers **quick-reply chips**; every chip set includes **Not sure** and **+ Add details**.
- Emergencies stop the interview without saving until you seek care.
- After **confirm**, the saved note uses everyday wording; vet messaging uses separate clinical copy.
