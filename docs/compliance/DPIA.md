# Data Protection Impact Assessment (DPIA) — PawBuck v1

**Draft for counsel review — not legal advice.**

## Processing overview

PawBuck is a pet health companion app: health records, Milo AI journal, inbound vet email, Pawthon GPS walks, and vet booking. See [ARCHITECTURE.md](../ARCHITECTURE.md).

## Necessity & proportionality (by feature)

| Feature | Data | Necessity | Mitigation |
|---------|------|-----------|------------|
| Health records | Pet profile, vaccines, labs, documents | Core product | RLS; export/delete; retention inventory |
| Milo journal | Health-adjacent chat text | User-initiated assistance | 12m TTL; Gemini **paid API tier** (no training on prompts/responses per Google terms); DPA — counsel sign-off pending; no secondary use without consent |
| Email ingestion | Attachments, sender metadata | User-configured pet inbox | Verification; 180d processed email TTL; admin support policy |
| Pawthon walks | Precise GPS (`points`) | Walk distance / engagement | 90d GPS minimization; distance retained |
| Booking | Appointment metadata | Scheduling UX | Vendor adapters in API only; no client secrets |
| Analytics | Event type + metadata | Product improvement | 14m TTL; minimal fields |

## Risk register

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|------------|--------|------------|----------|
| GPS re-identification | Medium | Medium | 90d point purge | Low–medium |
| Health text to Gemini | Medium | High | Paid API tier (verified 2026-06-28); DPA; minimal context; no AI Studio log sharing | Low–medium (pending DPA sign-off) |
| Incomplete erasure | High (pre-program) | High | `erase_user_data` RPC + purge worker + inventory CI | Low after Phase 1 |
| Support over-access | Medium | High | AdminSupport JWT + audit | Medium |
| Export link leak | Low | High | 7d signed URL; email to account owner | Low |

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Legal / DPO | | |
| Product | | |

Related: [DATA-INVENTORY.md](./DATA-INVENTORY.md), [ROPA.md](./ROPA.md), [SUBPROCESSORS.md](./SUBPROCESSORS.md)
