/**
 * Raw document text for tests and prompt examples.
 * Used to drive extraction tests and simulate Vision-LLM inputs.
 */

/** Beach Avenue–style cert: administered block vs booster-due block (Rabies due-only). */
export const BEACH_AVENUE_VACCINATION_CERT = `
Beach Avenue Animal Hospital
CERTIFICATE OF VACCINATION(S)
Date: 11 October, 2025

Patient: Milo | Species: Canine

Vaccinations Administered:
DAPP on 11-10-2025
Bordetella on 11-10-2025
Leptospirosis on 11-10-2025

Milo is due for booster vaccinations:
Rabies on 07-04-2028
DAPP on 10-10-2028
Bordetella on 11-10-2026
Leptospirosis on 11-10-2026
`;

/** Standard vaccine/visit receipt text (clear structure, one pet) */
export const STAINED_VET_RECEIPT = `
Beach Avenue Animal Hospital
123 Beach Ave, San Francisco CA
(415) 555-0123

Patient: Buddy
Species: Dog | Breed: Golden Retriever
Date of Visit: 11/10/2025

Vaccinations Administered:
- DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza) — Given 11/10/2025 — Next due 10/10/2028
- Rabies 1yr — Given 11/10/2025 — Next due 07/04/2028
- Bordetella — Given 11/10/2025 — Next due 11/10/2026
- Leptospirosis — Given 11/10/2025 — Next due 11/10/2026

Clinic: Beach Avenue Animal Hospital
Lot # on file.
`;

/** Messy, handwritten-style diet instructions (ambiguous, partial) */
export const HANDWRITTEN_DIET_NOTE = `
diet note
--------
give 1/2 cup 2x daily
no chicken !! 
something with fish or lamb
maybe start next week?
vets said low fat
(name smudged - Moxie or Max?)
`;

/** Receipt mentioning two different pets */
export const MULTI_PET_INVOICE = `
Happy Paws Veterinary Clinic
Invoice #8842 | Date: 03/15/2025

PET 1: Luna (Cat)
  - Annual wellness exam — $65
  - FVRCP booster — $42
  - Next vaccine due: 03/15/2026

PET 2: Cooper (Dog)
  - Annual wellness exam — $75
  - DHPP booster — $48
  - Rabies 3yr — $38
  - Next rabies due: 03/15/2028

Total: $268
Thank you for your business.
`;
