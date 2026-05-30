# Pet Health Passport v2 (PDF)

**Reference:** [`templates/Milo_Pet_Passport_v2.pdf`](templates/Milo_Pet_Passport_v2.pdf)  
**Implementation:** `apps/consumer-app/services/petPassportTemplate.ts`

## Pages

| Page | Sections |
|------|----------|
| 1 | Header (PAWBUCK · PET HEALTH PASSPORT · VERIFIED), pet identity grid, compliance banner, owner + primary vet, handling notes |
| 2 | Vaccination status (per vaccine), travel certificates (optional), EU passport ref (optional), jurisdiction table |
| 3 | Source documents index, verify URL + QR, legal disclaimer |

## Rules

- Mask microchip and phone in PDF (show last 4 digits).
- Never claim “fully compliant” without core vaccines + microchip on file.
- Omit optional subsections when data is missing (no fabrication).
- Footer on pages 1–2: `{petEmail} · Issued {date} · Scan QR on final page`.
