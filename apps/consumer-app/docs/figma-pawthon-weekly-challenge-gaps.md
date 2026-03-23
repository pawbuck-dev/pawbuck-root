# Pawthon weekly challenge card — Figma vs implementation

**Figma:** [PawBuck App Redesign — node `1896-122224`](https://www.figma.com/design/mXpatvXhVo25O1ggneWxrc/PawBuck-App-Redesign?node-id=1896-122224&m=dev)

The Figma file is not readable via API from this repo (auth + dev-mode specs). The **light-theme** dashboard card is implemented from your screenshots, the linked `Frame.svg`, and common tokens.

## Matched in code (light theme)

- Card cream background (`#FDF8F1` → `#FBF4EA` gradient), subtle border
- Uppercase **WEEKLY CHALLENGE** label (`Poppins_600SemiBold`, 11px, letter-spacing ~1.4, `#0D0F0F`)
- Headline **Are You The Best?** (24 / 30 line height, bold, `#0D0F0F`)
- Dynamic line: `#${rank} of ${total} pet parents are ahead of you 👀` (plus empty / unranked variants)
- **Tap to start a walk →** CTA
- Right column: `assets/images/trophy.png` via `PawthonTrophyIllustration` (Figma export; rank copy is app-only on the left)

## Gaps / things to verify manually in Figma (Dev Mode)

1. **Exact spacing** — padding inset, gap between text column and art, `minHeight` of the card (currently 160pt light / 152 dark).
2. **Corner radius** — light uses `20`; Figma may specify `16` / `24` — adjust `borderRadius` in `WeeklyChallengeCard.tsx`.
3. **Typography** — if the node uses a font other than **Poppins**, export names/weights from Inspect and update `fontFamily` (may need new font load in `app/_layout`).
4. **Trophy bleed** — if the design has the trophy **outside** the card clip, we keep `overflow: 'hidden'` on the card; you may need a taller `minHeight`, negative margin on the image, or `overflow: 'visible'` on a wrapper (trade-off with rounded corners).
5. **Frame.svg vs Figma** — current asset is large and includes embedded imagery/text paths. If pixels don’t match the frame, replace with the **exact export** from node `1896-122224` (SVG or PNG @1x/@2x).
6. **Sunburst** — Figma may use a separate vector/blur layer; we use soft circles + gold tint + art inside `Frame.svg`. Replace with a dedicated asset if Inspect shows a different treatment.
7. **Copy semantics** — `#rank of total … are ahead of you` is literal from the mock; if product prefers “You’re #n of m pet parents 👀”, change `formatWeeklyChallengeFigmaLine` in `services/walkSessions.ts`.

## Dark theme

Dark layout is **not** the Figma weekly-challenge screen; it keeps **PAWTHON**, **Walk with {pet}**, week km / streak, and **walkers** wording via `formatWeeklyWalkerRankLine`.
