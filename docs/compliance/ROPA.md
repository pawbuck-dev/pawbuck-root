# Records of Processing Activities (RoPA) — template

**Not legal advice.** Complete with counsel for each market (GDPR Art. 30).

| Field | PawBuck (v1) |
|-------|----------------|
| Controller | PawBuck (legal entity TBD) |
| DPO / contact | privacy@pawbuck.com (TBD) |
| Purposes | Pet health record management; AI-assisted journal; vet booking; email ingestion; engagement (Pawthon walks) |
| Categories of data subjects | Pet owners; household members; (future) service providers |
| Categories of personal data | Account (email); pet profile; health records; location (walk GPS); AI chat; communications |
| Recipients | Subprocessors in [SUBPROCESSORS.md](./SUBPROCESSORS.md) |
| Transfers | US (Supabase us-east-1, AWS, Gemini API) — document SCCs if EU/UK users |
| Retention | See [DATA-INVENTORY.md](./DATA-INVENTORY.md); GPS points minimized at 90d |
| Security | RLS; JWT auth; AdminSupport for ops; encryption in transit; service role server-only |
| Erasure | 7-day grace then `erase_user_data` + Storage purge + Auth delete — see compliance program |

Sign-off: _________________ Date: _________
