# PawBuck v1.5 pricing

Canonical product pricing and tier rules. Enforcement details: [`SUBSCRIPTION.md`](SUBSCRIPTION.md).

Source: [Pricing strategy artifact](https://claude.ai/public/artifacts/a3b51f9c-e56f-4972-80d2-d08a5606b967).

## Plans & prices (USD)

| Plan | Monthly | Annual | Founding (lifetime) | Pets | Family members |
|------|---------|--------|---------------------|------|----------------|
| **Free** | $0 | — | — | 1 | — |
| **Individual** | $5.99 | $49.99/yr | $34.99 one-time | 1 | — |
| **Family** | $9.99 | $79.99/yr | $54.99 one-time | Unlimited | Up to 5 |

**Code tier rank:** `free` = 0, `individual` = 1, `family` = 2.

## Founding Member program

- Hard cap: **500** combined founding purchases (Individual + Family lifetime SKUs).
- Launch window only; lifetime SKUs hidden when cap reached.
- Profile **Founding Member** badge; early access to new Milo capabilities (config flag).
- RevenueCat product ids: `founding_individual`, `founding_family` (non-renewing).

## Feature matrix

| Feature | Free | Individual | Family |
|---------|------|------------|--------|
| Pet profiles | 1 | 1 | Unlimited |
| Manual health log | ✓ | ✓ | ✓ |
| Pet Journal + streak | ✓ | ✓ | ✓ |
| Vet document uploads | 10 (account) | Unlimited | Unlimited |
| Milo AI conversations | 3 lifetime | Unlimited | Unlimited |
| AI journal entries | 2 lifetime | Unlimited | Unlimited |
| Symptom decision trees | — | ✓ | ✓ |
| Vet prep briefs | Teaser | Full | Full |
| Pet email parsing (`milo@`) | — | ✓ | ✓ |
| Pet Passport PDF export | — | ✓ | ✓ |
| Health alerts & reminders | — | ✓ | ✓ |
| Family sharing | — | — | Up to 5 |
| Multi-pet dashboard | — | — | ✓ |
| 3-tier permissions | — | — | ✓ |
| Per-pet email addresses | — | — | ✓ |
| Book vet visit | ✓ | ✓ | ✓ |
| Pet ownership transfer | ✓ | ✓ | ✓ |
| Weekly Pawthon challenge | ✓ | ✓ | ✓ |
| Pawthon GPS walk | ✓ | ✓ | ✓ |

## Document count (Free cap)

Per **account**, sum of:

- Rows in `public.pet_documents`
- Health rows with non-null `document_url` (vaccinations, clinical exams, lab results, medicines)

## Upgrade trigger moments

| Moment | Free behavior | Target plan |
|--------|---------------|-------------|
| Milo conversation cap | Block after 3rd conversation | Individual |
| Document cap | Block at 11th upload | Individual |
| Streak 10+ days | Upgrade prompt | Individual |
| Vet prep brief | Teaser only | Individual |

## RevenueCat SKUs

| Product id | Type | Entitlement |
|------------|------|-------------|
| `individual_monthly` | subscription | Pawbuck Individual |
| `individual_annual` | subscription | Pawbuck Individual |
| `family_monthly` | subscription | Pawbuck Family |
| `family_annual` | subscription | Pawbuck Family |
| `founding_individual` | non-renewing | Pawbuck Individual + founding flag |
| `founding_family` | non-renewing | Pawbuck Family + founding flag |

Legacy entitlement id `Pawbuck Pro` maps to **Individual** during transition.

## UAT checklist

- [ ] Free: 3 Milo chats then paywall on 4th
- [ ] Free: 10 docs then paywall on 11th
- [ ] Free: manual journal OK; 3rd AI journal blocked
- [ ] Free: vet brief teaser; Individual full brief
- [ ] Individual: passport export works
- [ ] Individual: 2nd pet blocked → Family paywall
- [ ] Family: 6th member invite blocked
- [ ] Founding purchase at cap rejected
- [ ] Restore purchase restores plan + badge
