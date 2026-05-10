# PawBuck consumer app — product help coverage

Auditable checklist for Milo RAG (`documentation` table). Each row maps to one or more Markdown sources under this folder.

| Area | Source file(s) | App routes / entry points |
|------|----------------|---------------------------|
| General FAQ | `00-general-faq.md` | Marketing / pre-auth |
| Home & nav | `01-home-and-navigation.md` | `(home)/home`, bottom nav |
| Pet profile & health hub | `02-pet-profile-health-record.md` | `pet-profile`, `health-record/[id]`, `onboarding/*` (optional DOB/weight) |
| Vaccinations | `03-vaccinations.md` | Health tabs, upload modals |
| Medications & labs & exams | `04-medications-labs-exams.md` | Health tabs, detail screens |
| Messages & pet email | `05-messages-pet-email.md` | `messages`, processed email flows |
| Family access & invites | `06-family-sharing.md` | `family-access`, `join-household` |
| Pet transfer | `07-pet-transfer.md` | `transfer-pet`, claim flow |
| Milo AI | `08-milo.md` | `milo`, Milo chat modal |
| Pawthon & walks | `09-pawthon-walks.md` | `pawthon`, `pawthon-walk`, leaderboard |
| Vet booking | `10-book-vet-visit.md` | `book-vet-visit/*` |
| Pet journal | `11-pet-journal.md` | `pet-journal/*` |
| Settings & notifications | `12-settings-notifications.md` | `profile` (Reminders + Settings rows), `settings` → redirect to profile, device OS settings |
| Account & privacy | `13-account-privacy.md` | profile, sign-out, delete account |
| Contact support | `14-contact-support.md` | `contact` |
| Documents, ID, invoices | `15-documents-id-invoices.md` | `health-record/[id]` hub → Documents & ID, `FinancialInvoicesSection` |

Update this table when adding routes or help articles.
