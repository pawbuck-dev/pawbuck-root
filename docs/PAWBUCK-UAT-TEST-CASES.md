# PawBuck — User Acceptance Testing (UAT) Test Cases

**Document version:** 1.0  
**Generated:** June 28, 2026  
**Environment:** Staging (recommended) unless noted as Production smoke  
**Canonical sources:** `docs/EMAIL-PROCESSING-UAT.md`, `docs/compliance/COMPLIANCE-UAT.md`, `docs/TESTING_FAMILY_SHARING.md`, `docs/TESTING_PET_TRANSFER.md`, `docs/PRICING.md`, `docs/REVENUECAT.md`, `docs/PAWTHON_FIELD_TEST.md`, `.maestro/README.md`

---

## Table of contents

1. [Auth, onboarding & core navigation](#1-auth-onboarding--core-navigation)
2. [Pet email processing — inbound & sender gate](#2-pet-email-processing--inbound--sender-gate)
3. [Pet email processing — Review Inbox](#3-pet-email-processing--review-inbox)
4. [Pet email processing — resolve API & reprocess](#4-pet-email-processing--resolve-api--reprocess)
5. [Admin portal — email & support ops](#5-admin-portal--email--support-ops)
6. [Email processing — production smoke](#6-email-processing--production-smoke)
7. [Family sharing & household access](#7-family-sharing--household-access)
8. [Pet transfer](#8-pet-transfer)
9. [Shared daily care (Today rings)](#9-shared-daily-care-today-rings)
10. [Subscription, pricing & RevenueCat](#10-subscription-pricing--revenuecat)
11. [Compliance — account deletion, export & retention](#11-compliance--account-deletion-export--retention)
12. [Health documents & exports](#12-health-documents--exports)
13. [Notifications & reminders](#13-notifications--reminders)
14. [Pawthon walk tracking (field test)](#14-pawthon-walk-tracking-field-test)
15. [Maestro device E2E flows (automated UAT)](#15-maestro-device-e2e-flows-automated-uat)
16. [Legal & store (non-code)](#16-legal--store-non-code)

---

## How to use this document

| Column | Meaning |
|--------|---------|
| **ID** | Unique test case identifier |
| **Area** | Product domain |
| **Given** | Preconditions |
| **When** | Action |
| **Then** | Expected result / pass criteria |
| **Priority** | P1 = release blocker, P2 = important, P3 = nice-to-have |

Record **Pass / Fail / Blocked / N/A**, tester name, date, build version, and notes for each case.

---

## 1. Auth, onboarding & core navigation

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| AUTH-01 | Auth | Valid credentials | Sign in via email/password | User lands on Home; session persists | P1 |
| AUTH-02 | Auth | New user | Sign up | Account created; onboarding or empty Home | P1 |
| AUTH-03 | Onboarding | New user, no pets | Complete add-first-pet flow (steps 1–9) | Pet saved; appears on Home with pet email | P1 |
| AUTH-04 | Onboarding | New user | Skip optional steps (DOB, weight, ID) | Pet still saves successfully | P2 |
| AUTH-05 | Navigation | Signed-in user | Navigate all bottom tabs | Home, Messages, Milo, Profile load without crash | P1 |
| AUTH-06 | Auth | Signed out | Open protected route | Redirect to sign-in | P1 |

---

## 2. Pet email processing — inbound & sender gate

*Source: `docs/EMAIL-PROCESSING-UAT.md` §11*

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| IN-01 | Email inbound | Pet exists; sender whitelisted; valid vaccination PDF matching pet | Vet emails PDF to pet address | `processed_emails`: success=true, review_status=resolved; record in health/vault; push `email_processed`; **no** Processing errors | P1 |
| IN-02 | Email inbound | Unknown sender; email has PDF | Webhook fires | `pending_email_approvals.status=pending`; JSON in `pending-emails`; push `email_approval`; **no** `processed_emails` yet | P1 |
| IN-03 | Email inbound | IN-02 pending approval | User taps Approve | Sender whitelisted; email processed; records filed; approval approved | P1 |
| IN-04 | Email inbound | Unknown sender | User taps Reject | Approval rejected; sender blocked; future mail from sender → 403 | P1 |
| IN-05 | Email inbound | Sender blocked in safe senders | Webhook fires | 403; no processed_emails row | P1 |
| IN-06 | Email inbound | Invalid Mailgun signature | Webhook fires | 401; no DB changes | P2 |
| IN-07 | Email inbound | Recipient not mapped to any pet | Webhook fires | 404 | P2 |
| IN-08 | Email inbound | Same Message-Id delivered twice within seconds | Second webhook | 200 "Email already processed"; no duplicate records | P1 |
| IN-09 | Email inbound | Email with no attachments (body only) | Webhook | success=true, resolved; no Review Inbox | P2 |
| IN-10 | Email inbound | Care team vet email linked to pet | Inbound from vet | No approval step; processes immediately | P1 |

---

## 3. Pet email processing — Review Inbox

*Source: `docs/EMAIL-PROCESSING-UAT.md` §11*

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| RI-01 | Review Inbox | Whitelisted sender; PDF breed/name does not match pet | Webhook | success=false, review_status=pending, failure_reason populated; JSON stored; **Processing errors (1)** | P1 |
| RI-02 | Review Inbox | RI-01 row in inbox | User opens item | Failure summary visible; attachment preview works if JSON has bodies | P1 |
| RI-03 | Review Inbox | RI-01; user fixes pet profile OR picks correct pet on confirm | Confirm as Vaccine | 200; review_status=resolved; vaccine record exists; "Record filed!" | P1 |
| RI-04 | Review Inbox | RI-01 row | User dismisses | review_status=dismissed; leaves inbox; records unchanged | P1 |
| RI-05 | Review Inbox | Row dismissed | User opens Messages | Item **not** in Processing errors | P1 |
| RI-06 | Review Inbox | Metadata-only JSON (large email stripped bodies) | Preview attachment | Unavailable / ATTACHMENT_BODY_NOT_ARCHIVED | P2 |
| RI-07 | Review Inbox | JSON deleted from `pending-emails` | Confirm | 422 or edge failure; row stays pending | P2 |

---

## 4. Pet email processing — resolve API & reprocess

*Source: `docs/EMAIL-PROCESSING-UAT.md` §11*

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| RP-01 | Resolve API | Valid Review Inbox row + stored JSON + secrets configured | Confirm Lab | Record filed; resolved | P1 |
| RP-02 | Resolve API | Edge missing `PAWBUCK_API_URL` | Confirm | 422 or pipeline failure; stays pending | P2 |
| RP-03 | Resolve API | Row already resolved | Confirm | 409 already marked successfully processed | P2 |
| RP-04 | Resolve API | Row dismissed | Confirm | 409 already dismissed | P2 |
| RP-05 | Resolve API | Double-tap Confirm while first run in progress | Second request | 409 "currently being processed" (expected) | P2 |
| RP-06 | Resolve API | Wrong pet selected (not owner) | API call | 403 | P2 |

---

## 5. Admin portal — email & support ops

*Source: `docs/EMAIL-PROCESSING-UAT.md` §11; admin routes in `docs/design/ADMIN_PORTAL_REDESIGN.md`*

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| AD-01 | Admin | Multiple pending failures in date range | Bulk dismiss (dry run → execute) | Rows dismissed; consumer inbox count drops | P1 |
| AD-02 | Admin | Failures with stored JSON | Bulk reprocess (10 batch) | Records filed; rows resolved | P1 |
| AD-03 | Admin | Failures | Bulk resolve **without** reprocess | review_status=resolved but **no** new health records | P1 |
| AD-04 | Admin | Dismissed row | Bulk reprocess with includeDismissed | Can reprocess (admin only) | P2 |
| AD-05 | Admin | API or Edge not configured | Email ops → Check pipeline health | Red checks with hints; green when secrets aligned | P1 |
| AD-06 | Admin | Row stuck `status=processing` | Email ops → Unlock or Mail errors detail Unlock stuck email | Row becomes `completed`; owner Confirm or admin file works | P1 |
| AD-07 | Admin | Owner email known, stored archive | Email ops → Add records to pet profile | Health records filed; row resolved | P1 |
| AD-08 | Admin | Backlog after config fix | Email ops → File all ready or Mail errors File all ready | Batches until eligible=0 | P1 |
| AD-09 | Admin | Noise / already handled | Email ops → Remove from app | Dismissed; no new health records | P2 |
| AD-10 | Admin | Quality tracking | Processing tab date range | Success rate, failure categories, first/last seen dates | P2 |
| AD-11 | Admin | Support JWT with admin role | Open `/email/inbox` row detail | Diagnostics show consumer visibility, archive status, recommended action | P1 |
| AD-12 | Admin | Support user | Command center `/home` | Metrics and queue summary load | P2 |

---

## 6. Email processing — production smoke

*Source: `docs/EMAIL-PROCESSING-UAT.md` §11*

| ID | Area | Step | Pass criteria | Priority |
|----|------|------|---------------|----------|
| E2E-01 | Email smoke | Send test vaccine PDF from whitelisted sender | Auto-filed within 2 min | P1 |
| E2E-02 | Email smoke | Send from unknown sender → approve | Files after approval | P1 |
| E2E-03 | Email smoke | Force validation failure → Confirm in app | "Record filed!" and record visible | P1 |
| E2E-04 | Email smoke | Admin preview attachment for failed row | PDF renders or clear error code | P1 |

---

## 7. Family sharing & household access

*Source: `docs/TESTING_FAMILY_SHARING.md`*

### Owner (sender)

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| FS-01 | Family sharing | Free account | Create household MTCH or email invite | Prompt Family plan (`family_access_invite`) | P1 |
| FS-02 | Family sharing | Individual account | Create invite | Blocked | P1 |
| FS-03 | Family sharing | Family account | Create invite | Succeeds | P1 |
| FS-04 | Family sharing | Family account, pet selected | Send email invite with role | Invite sent; recipient can accept | P1 |
| FS-05 | Family sharing | Family account | Generate MTCH code | Copy/QR works | P1 |
| FS-06 | Family sharing | Member joined | Remove member | Grantee loses pet access | P1 |

### Recipient (family member)

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| FS-07 | Family sharing | New or empty Home | Welcome or Profile | Join with invite code discoverable | P1 |
| FS-08 | Family sharing | Valid MTCH code | Enter code → sign in if needed | Shared pets on Home | P1 |
| FS-09 | Family sharing | Email invite link | Open `/accept-invite?token=…` → sign in with matching email | Pet on Home | P1 |
| FS-10 | Family sharing | Signed in as different user than invite email | Accept email invite | `email_mismatch` message | P1 |
| FS-11 | Family sharing | Owner's own MTCH code | Attempt self-join | Error | P2 |

### Plan gates

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| FS-12 | Plan gates | Free plan | Invite / share | Blocked at invite | P1 |
| FS-13 | Plan gates | Free plan, already owns 1 pet | Accept transfer | Blocked | P1 |
| FS-14 | Plan gates | Family plan | Invite / accept transfer | Succeeds | P1 |

### Device UAT (two devices)

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| FS-D01 | Device UAT | Cold install | Sign up → Join with Invite Code → MTCH accept | Pets on Home | P1 |
| FS-D02 | Device UAT | Owner sends email invite | Recipient opens link → matching email sign-in | Pet on Home | P1 |
| FS-D03 | Device UAT | Email invite, wrong account | Accept attempt | Clear error on `/accept-invite` | P1 |
| FS-D04 | Device UAT | Two accounts | Owner removes household member | Grantee loses shared pets | P1 |
| FS-D05 | Device UAT | Free test account | Premium gates on invite create | Paywall shown (if enabled) | P2 |

---

## 8. Pet transfer

*Source: `docs/TESTING_PET_TRANSFER.md`*

### Sender (current owner)

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| PT-01 | Pet transfer | Free account | Start transfer | Prompt Premium (`pet_transfer_create`) | P1 |
| PT-02 | Pet transfer | Premium account | Profile → Transfer Ownership → pick pet → reason | Prep snapshot shows weight, meds, last vet | P1 |
| PT-03 | Pet transfer | Transfer wizard | Highlight up to 5 journal entries; exclude non–vet-flagged | Same entry cannot be both highlighted and excluded | P1 |
| PT-04 | Pet transfer | Transfer ready | Generate code | Format `TRF-XXXX-YYYY-####`; copy/share; QR; ~14 day expiry | P1 |
| PT-05 | Pet transfer | Active code exists | Second code for same pet | Error until first cancelled or expired | P1 |
| PT-06 | Pet transfer | Active code | Cancel | Recipient preview/accept fails afterward | P1 |

### Recipient (new owner)

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| PT-07 | Pet transfer | Valid code | Claim a Pet → enter code (case-insensitive) | Step 2 preview loads | P1 |
| PT-08 | Pet transfer | Wrong/expired/used code | Enter code | Clear error on step 1 or 2 | P1 |
| PT-09 | Pet transfer | Logged out on step 2 | Attempt accept | Sign-in/sign-up prompt with return to step 2 | P1 |
| PT-10 | Pet transfer | Free account | Accept transfer | Prompt Premium (`pet_transfer_accept`) | P1 |
| PT-11 | Pet transfer | Valid code | Preview step | Pet name, breed, photo, record counts, journal snippets | P1 |
| PT-12 | Pet transfer | Valid code | Decline | Code inactive; sender can create new code | P1 |
| PT-13 | Pet transfer | Valid code, Premium | Accept with parent display name | Success step 3; pet in list with records | P1 |
| PT-14 | Pet transfer | Same account as sender | Accept own code | Server error (cannot transfer to yourself) | P1 |

### After accept & edge cases

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| PT-15 | Pet transfer | Transfer accepted | Sender views pet list | Pet removed or no longer editable as owner | P1 |
| PT-16 | Pet transfer | Transfer accepted | Recipient views health | Records, journal (minus excluded), meds, documents visible | P1 |
| PT-17 | Pet transfer | Transfer accepted | Transfer history | Prior owner label respects "show my name" toggle | P2 |
| PT-18 | Pet transfer | Transfer accepted | Family access | Old shares cleared; recipient re-invites if needed | P1 |
| PT-19 | Pet transfer | Edge notify configured | Create/accept/decline | Email/push notifications sent | P2 |
| PT-20 | Pet transfer | Expired code | Accept attempt | Invalid / expired message | P1 |
| PT-21 | Pet transfer | Declined code | Accept attempt | Cannot accept; new code required | P1 |
| PT-22 | Pet transfer | Deleted pet | Preview/accept | Fails | P2 |
| PT-23 | Pet transfer | Vet-flagged journal in exclude list | Create transfer | Blocked at create or RPC | P2 |

---

## 9. Shared daily care (Today rings)

*Source: `docs/TESTING_FAMILY_SHARING.md`, `docs/plans/shared-pet-daily-care.md`*

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| SDC-01 | Shared Today | Owner + shared pet | Owner logs meals/water/output on Home | Rings show non-zero counts | P1 |
| SDC-02 | Shared Today | Family member on same pet | Open Home | Identical ring values (not separate empty log) | P1 |
| SDC-03 | Shared Today | Contributor role | Bump rings | Updates persist for household | P1 |
| SDC-04 | Shared Today | View-only role | Attempt edit | View-only message; cannot edit | P1 |
| SDC-05 | Shared Today | Household with walks | Any member completes walk | Streak and daily distance goal count for pet | P2 |

---

## 10. Subscription, pricing & RevenueCat

*Sources: `docs/PRICING.md`, `docs/REVENUECAT.md`, `docs/compliance/COMPLIANCE-UAT.md` §7*

### Pricing v1.5 caps

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| SUB-01 | Pricing | Free user | 4th Milo chat | Paywall on 4th | P1 |
| SUB-02 | Pricing | Free user | 11th document | Paywall on 11th | P1 |
| SUB-03 | Pricing | Free user | Manual journal | OK; 3rd AI journal blocked | P1 |
| SUB-04 | Pricing | Free user | Vet brief | Teaser only; Individual gets full brief | P2 |
| SUB-05 | Pricing | Individual user | Passport export | Works | P1 |
| SUB-06 | Pricing | Individual user, 1 pet | Add 2nd pet | Family paywall | P1 |
| SUB-07 | Pricing | Family user | 6th member invite | Blocked | P1 |
| SUB-08 | Pricing | Founding cap reached | Founding purchase | Rejected | P2 |
| SUB-09 | Pricing | Prior purchaser | Restore purchase | Plan + badge restored | P1 |
| SUB-10 | Pricing | Free user | Add 2nd pet | Blocked | P1 |

### RevenueCat sandbox

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| RC-01 | RevenueCat | Signed in | App launch | `syncRevenueCatUser` sets RC app_user_id = Supabase user id | P1 |
| RC-02 | RevenueCat | Free user | Profile / Compare plans | Shows Free; store prices or fallback | P1 |
| RC-03 | RevenueCat | Free user | Subscribe Individual (Apple sandbox) | Profile shows Individual | P1 |
| RC-04 | RevenueCat | Purchase complete | Check DB | Webhook row in `user_entitlements` with correct product_id | P1 |
| RC-05 | RevenueCat | Individual user | Add 2nd pet | Family paywall; purchase Family → unlimited pets | P1 |
| RC-06 | RevenueCat | Prior purchaser | Reinstall → Restore purchases | Plan restored | P1 |
| RC-07 | RevenueCat | Founding SKU available | Purchase founding | `is_founding_member = true` (cap 500 in DB) | P2 |

---

## 11. Compliance — account deletion, export & retention

*Source: `docs/compliance/COMPLIANCE-UAT.md`*

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| CMP-01 | Compliance | Staging DB | Run `verify-rpcs.sql` | RPCs and pricing v1.5 tables exist | P1 |
| CMP-02 | Compliance | `delete-account` edge deployed | POST schedule | Returns `purge_after` (~7 days) | P1 |
| CMP-03 | Compliance | Scheduled deletion | POST cancel | Clears scheduled deletion | P1 |
| CMP-04 | Compliance | Deletion scheduled | Sign in during grace | Succeeds; Profile shows cancel deletion (no auth ban) | P1 |
| CMP-05 | Compliance | Populated test account | Profile → Delete account → confirm | `account_deletion_requests` row with future `purge_after` | P1 |
| CMP-06 | Compliance | Grace period elapsed (staging backdate) | Purge worker runs | User rows gone; `account_deletion_log` entry; zero residual PII | P1 |
| CMP-07 | Compliance | Populated account | Profile → Download my data | Export email with signed link within TTL | P1 |
| CMP-08 | Compliance | Export link received | Open and validate JSON | Sections include pets, health, preferences | P1 |
| CMP-09 | Compliance | Admin access | Command center → Retention jobs | Recent runs visible | P2 |
| CMP-10 | Compliance | Old walk with points (optional) | After worker cycle | `points` nulled; `points_pruned_at` set | P2 |
| CMP-11 | Compliance | ECS deployed | GET `/api/health` | `supabaseServiceRoleConfigured: true` | P1 |

---

## 12. Health documents & exports

*Sources: `docs/design/PET_PASSPORT_V2_SPEC.md`, `docs/design/VET_SUMMARY_V2_SPEC.md`*

### Pet passport PDF

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| DOC-01 | Passport | Travel-ready pet (microchip, rabies, FAVN/titer) | Export passport PDF | Page 2 travel block populated; EU jurisdiction notes mention titer | P1 |
| DOC-02 | Passport | Minimal pet (no titer/travel docs) | Export passport PDF | No TRAVEL CERTIFICATES section on page 2 | P2 |
| DOC-03 | Passport | Device PDF pipeline OK | Export passport PDF | QR renders on page 3 | P1 |

### Vet summary PDF

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| DOC-04 | Vet summary | Rich pet (labs, vaccines, baseline, insurance vault) | Generate PDF | Up to 4 pages with lab markers and insurance | P1 |
| DOC-05 | Vet summary | Minimal pet (pet + one vaccine) | Generate PDF | Fewer than 4 pages; no empty sheets | P1 |
| DOC-06 | Vet summary | Sparse data (no flagged journal, no exams) | Generate PDF | Page 3 omitted entirely | P2 |

---

## 13. Notifications & reminders

*Source: `docs/NOTIFICATIONS_5.4_AUDIT.md`*

| ID | Area | Given | When | Then | Priority |
|----|------|-------|------|------|----------|
| NOT-01 | Notifications | Profile Reminders | Toggle journal; change evening hour | Local reschedule reflected in device notification list | P1 |
| NOT-02 | Notifications | Vaccination local notification | Tap notification | Opens vaccinations tab | P1 |
| NOT-03 | Notifications | Journal prompt notification | Tap notification | Opens pet journal with correct petId | P1 |
| NOT-04 | Notifications | Edge `scheduled-care-reminders` deployed | Run one POST | Dedupe tables prevent duplicate pushes on repeat | P2 |
| NOT-05 | Notifications | Vet booking with start_utc in 23–25h window | Reminder window | At most one push per window | P2 |
| NOT-06 | Notifications | Vet booking with start_utc in 50–70m window | Reminder window | At most one push per window | P2 |
| NOT-07 | Notifications | User disabled document expiry push | Server push attempt | Respects `document_expiry_push_enabled` | P2 |
| NOT-08 | Care nudges | Pet with overdue synced vaccination | Open Home | Up to 3 care reminders shown; tap opens vaccinations tab | P1 |
| NOT-09 | Care nudges | Active care reminder on Home | Tap ✕ snooze | Reminder hidden for 7 days; reappears after snooze date | P1 |
| NOT-10 | Care nudges | Profile → Reminders | Disable **Vaccine care reminders** | No vaccine digest push; in-app reminders may still show | P2 |
| NOT-11 | Care nudges | `CareNudges:Enabled` + Edge cron | Duplicate POST to run-internal | One digest push per dedupe key per day | P2 |
| NOT-12 | Care nudges | Missing core vaccine (no row on file) | Home + digest (Phase D) | `vac_missing_required` in-app; digest when push enabled | P2 |

---

## 14. Pawthon walk tracking (field test)

*Source: `docs/PAWTHON_FIELD_TEST.md`*

**Setup:** Development or production build with native location (not Expo Go). Test each combination of phone mode × environment on the same ~2 km loop.

| ID | Phone mode | Environment | Pass criteria | Priority |
|----|------------|-------------|---------------|----------|
| PAW-01 | Hand, screen on | Downtown / urban canyon | Trace overlays within ~10 m vs baseline where GPS good | P1 |
| PAW-02 | Hand, screen on | Residential, open sky | Trace overlays within ~10 m vs baseline where GPS good | P1 |
| PAW-03 | Hand, screen on | Heavy tree cover | Trace overlays within ~10 m vs baseline where GPS good | P2 |
| PAW-04 | Pocket, screen off | Downtown / urban canyon | No long zero-update gaps while moving (note device/OS if killed) | P1 |
| PAW-05 | Pocket, screen off | Residential, open sky | No long zero-update gaps while moving | P1 |
| PAW-06 | Pocket, screen off | Heavy tree cover | No long zero-update gaps while moving | P2 |
| PAW-07 | Backpack / bag, screen off | Downtown / urban canyon | No long zero-update gaps while moving | P2 |
| PAW-08 | Backpack / bag, screen off | Residential, open sky | No long zero-update gaps while moving | P2 |
| PAW-09 | Backpack / bag, screen off | Heavy tree cover | No long zero-update gaps while moving | P3 |

---

## 15. Maestro device E2E flows (automated UAT)

*Source: `.maestro/README.md` — Milo AI intentionally out of scope*

| ID | Flow file | Description | Pass criteria | Priority |
|----|-----------|-------------|---------------|----------|
| MAS-01 | `login-email.yaml` | Email login | User reaches authenticated Home | P1 |
| MAS-02 | `add-first-pet-start.yaml` | Onboarding step 2 only | Pet type/country step completes | P1 |
| MAS-03 | `add-first-pet-complete.yaml` | Full onboarding steps 1–9 + save | Pet saved and visible on Home | P1 |
| MAS-04 | `join-household-mtch.yaml` | Family sharing MTCH | Recipient sees shared pets | P1 |
| MAS-05 | `accept-email-invite.yaml` | Email invite deep link | Pet appears after accept | P1 |
| MAS-06 | `claim-pet-trf.yaml` | Pet transfer TRF | Recipient owns pet after accept | P1 |
| MAS-07 | `messages-inbox-smoke.yaml` | Messages inbox | Inbox loads without crash | P1 |

**Prerequisites:** Maestro CLI, seeded accounts (`pnpm run maestro:seed`), staging/local Supabase + API.

---

## 16. Legal & store (non-code)

*Source: `docs/compliance/COMPLIANCE-UAT.md`*

| ID | Area | Checklist item | Priority |
|----|------|----------------|----------|
| LEG-01 | Legal | Counsel TTL sign-off on retention windows | P2 |
| LEG-02 | Legal | Published privacy policy lists subprocessors | P1 |
| LEG-03 | Legal | App Store / Play data forms updated per store disclosures | P1 |

---

## Summary statistics

| Category | Test case count |
|----------|-----------------|
| Auth & onboarding | 6 |
| Email inbound & sender | 10 |
| Review Inbox | 7 |
| Resolve API | 6 |
| Admin portal | 12 |
| Email production smoke | 4 |
| Family sharing | 19 |
| Pet transfer | 23 |
| Shared daily care | 5 |
| Subscription & RevenueCat | 17 |
| Compliance | 11 |
| Health documents | 6 |
| Notifications | 7 |
| Pawthon field test | 9 |
| Maestro E2E | 7 |
| Legal / store | 3 |
| **Total** | **152** |

---

## Related documentation

- [EMAIL-PROCESSING-UAT.md](./EMAIL-PROCESSING-UAT.md) — Full email pipeline reference
- [COMPLIANCE-UAT.md](./compliance/COMPLIANCE-UAT.md) — Compliance runbook
- [TESTING_FAMILY_SHARING.md](./TESTING_FAMILY_SHARING.md) — Family sharing coverage
- [TESTING_PET_TRANSFER.md](./TESTING_PET_TRANSFER.md) — Pet transfer coverage
- [TESTING.md](./TESTING.md) — Automated test commands
- [PRICING.md](./PRICING.md) — Plan limits
- [REVENUECAT.md](./REVENUECAT.md) — Billing integration

---

*End of document*
