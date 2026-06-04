# Veterinary Summary v2 (PDF)

**Reference:** [`templates/Milo_Vet_Summary_v2.pdf`](templates/Milo_Vet_Summary_v2.pdf)  
**Implementation:** `apps/consumer-app/services/vetSummaryTemplate.ts`  
**Data:** `apps/consumer-app/services/healthExportBundle.ts`, `apps/consumer-app/utils/healthExportDerived.ts`

## Pages (dynamic)

Page count is **not fixed**. Sections are omitted when there is no record data; entire pages are skipped if every section on that page would be empty (except page 1, which always renders the clinical overview).

| Typical page | Sections |
|------|----------|
| 1 (required) | Header (freshness, verify link), pet strip, record-based clinical summary, active clinical picture (4 cards) |
| 2 (conditional) | Trending vitals, lab markers (when labs exist), vaccination history table |
| 3 (conditional) | Active case narratives, medical timeline, active workup labs, parent observations (90 days) |
| 4 (conditional) | Insurance (from `pet_documents`), behavioral profile, source appendix, verify URL + QR |

Headers/footers renumber as `01 / N` … `N / N`.

## Rules

- PDF valid **14 days** from generation (shown in header).
- Clinical summary: deterministic bundle text or optional API narrative when configured; **never show confidence %** in the PDF (always “Record-based summary” label).
- Record-backed fields only; omit sections (and pages) when data is missing — no placeholder-only pages.
- Lab markers from `lab_results`; vitals from weight logs, `daily_intake`, and `walk_sessions`.
- Verify QR on the final emitted page when PDF generation succeeds.

## Deferred (post-v1)

- Vaccine batch/lot column (requires schema + OCR)
- Tokenized verify URLs (`/v/{slug}-{token}`)
- Dedicated PawBuck.API export endpoint for AI case narratives / lab interpretation
- Clinical-behavior vet-cut fields (muzzle, bite history)

## Manual UAT

Generate PDFs for:

1. **Rich pet** — labs, vaccines, baseline, insurance vault doc → expect up to 4 pages with lab markers and insurance.
2. **Minimal pet** — pet + one vaccine → expect **fewer than 4 pages**, no empty sheets.
3. **Sparse page 3** — no flagged journal, no exams → page 3 omitted entirely.
