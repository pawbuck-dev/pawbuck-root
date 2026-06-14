# Store data disclosures (Apple / Google)

Map PawBuck inventory categories to store forms. Update when [DATA-INVENTORY.md](./DATA-INVENTORY.md) or [inventoried-tables.txt](./inventoried-tables.txt) changes.

## Apple Privacy Nutrition Labels (summary)

| Data type | Linked to user | Used for tracking | Purpose |
|-----------|----------------|-------------------|---------|
| Contact info (email) | Yes | No | App functionality, account |
| Health & fitness (pet health) | Yes | No | App functionality |
| Location (precise, walks) | Yes | No | App functionality |
| User content (journal, email) | Yes | No | App functionality |
| Identifiers (account, device push) | Yes | No | App functionality |
| Purchases | Yes | No | App functionality |

## Google Play Data Safety (summary)

| Data | Collected | Shared | Purpose | Optional |
|------|-----------|--------|---------|----------|
| Email | Yes | Subprocessors only | Account | No |
| Health info (pet) | Yes | Subprocessors (AI OCR) | Core features | No |
| Location (precise) | Yes | No | Pawthon walks | No (feature-gated) |
| Photos/documents | Yes | Subprocessors | Health vault | No |
| App interactions | Yes | No | Analytics | Deletable via account delete |

## Account deletion (store requirement)

- **In-app:** Profile → Delete account (7-day grace, cancel anytime).
- **Web:** [WEB-ACCOUNT-DELETION.md](./WEB-ACCOUNT-DELETION.md)

## Subprocessors

Listed in [SUBPROCESSORS.md](./SUBPROCESSORS.md) and privacy policy.
