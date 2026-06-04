# Pet Health Passport v2 (PDF)

**Reference:** [`templates/Milo_Pet_Passport_v2.pdf`](templates/Milo_Pet_Passport_v2.pdf)  
**Implementation:** `apps/consumer-app/services/petPassportTemplate.ts`  
**Data:** `apps/consumer-app/services/healthExportBundle.ts`, `apps/consumer-app/utils/healthExportDerived.ts`

## Pages (fixed 3)

| Page | Sections |
|------|----------|
| 1 | Header (PAWBUCK · PET HEALTH PASSPORT · VERIFIED), pet identity grid, compliance banner, owner + primary vet, handling notes |
| 2 | Vaccination status (per vaccine), travel certificates (optional), EU passport ref (optional), jurisdiction table |
| 3 | Source documents index, verify URL + QR, legal disclaimer |

Optional subsections on page 2 are omitted when data is missing; the page still renders (vaccines + jurisdiction remain).

## Rules

- Mask microchip and phone in PDF (owner and primary vet phone).
- Section label: **Owner & primary vet** (no separate emergency-contact entity in v1).
- Never claim “fully compliant” without core vaccines + microchip on file (`hasCoreTravelReadiness`).
- Compliance banner mentions rabies titer when titer data exists in labs or vault docs.
- Travel certificates block: rabies titer from `lab_results` or vault `keyFacts`; optional `travel_certificate` vault rows.
- Omit optional subsections when data is missing (no fabrication).
- Footer on pages 1–2: `{petEmail} · Issued {date} · Scan QR on final page`.

## Deferred (post-v1)

- Emergency contacts schema / profile UI
- Live verify token URLs on `pawbuck.app/p/{slug}`
- Vaccine batch/lot on vaccination cards

## Manual UAT

1. **Travel-ready pet** — microchip, rabies, FAVN lab or vault titer → page 2 travel block populated; EU jurisdiction notes mention titer.
2. **Minimal pet** — no titer/travel docs → no `TRAVEL CERTIFICATES` section on page 2.
3. **Verify page** — QR renders on page 3 when device PDF pipeline succeeds.
