# Veterinary Summary v2 (PDF)

**Reference:** [`templates/Milo_Vet_Summary_v2.pdf`](templates/Milo_Vet_Summary_v2.pdf)  
**Implementation:** `apps/consumer-app/services/vetSummaryTemplate.ts`

## Pages

| Page | Sections |
|------|----------|
| 1 | Header (freshness, verify link), pet strip, Milo clinical summary, active clinical picture (4 cards) |
| 2 | Trending vitals, lab markers (when labs exist), vaccination history table |
| 3 | Active case narratives (when journal/exams support), medical timeline |
| 4 | Insurance (from `pet_documents`), behavioral profile, source appendix |

## Rules

- PDF valid **14 days** from generation (shown in header).
- Clinical summary: API text when available; else deterministic bundle summary (no fake confidence %).
- Record-backed fields only; omit insurance block if no policy document.
