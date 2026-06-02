-- Manual seed: public.documentation (placeholder embeddings only)
-- Apply in Supabase SQL Editor (or psql) on the project PawBuck.API uses.
--
-- LIMITATIONS: Every row shares the same zero vector. match_documentation will
-- return arbitrary rows for a real query embedding. For production, run:
--   cd apps/consumer-app && npx tsx scripts/seed-documentation-rag.ts
-- which clears and reloads with proper Gemini gemini-embedding-2 (768) vectors.
--
-- Idempotent: deletes rows tagged corpus = pawbuck-product-help-manual first.

BEGIN;

DELETE FROM public.documentation WHERE metadata->>'corpus' = 'pawbuck-product-help-manual';

WITH zero_emb AS (
  SELECT (
    '[' || (SELECT string_agg('0', ',') FROM generate_series(1, 768)) || ']'
  )::extensions.vector(768) AS embedding
)
INSERT INTO public.documentation (content, metadata, embedding)
SELECT v.content, v.metadata, z.embedding
FROM (
VALUES
(
$pbdoc_00_general_faq_md$
# PawBuck — general FAQ

Canonical answers for common questions. Ground Milo replies in this file for product overview topics.

## What is PawBuck?

PawBuck is your pet's personal health operating system. Every pet gets their own email address (like milo@pawbuck.app) that automatically organizes all their health documents in one secure, searchable place.

## How is PawBuck different from other pet apps?

Your pet has a real email address. Forward vet bills, vaccination records, or prescriptions to your pet's email, and PawBuck automatically parses and organizes everything into their health profile. You can also upload documents manually anytime.

## How does my pet's email address work?

When you create a profile for your pet, they get a unique email address (yourpet@pawbuck.app). Any health document sent to this address is automatically saved, categorized, and added to their health record.

## What can I send to my pet's email?

Anything health-related: vet invoices, vaccination certificates, prescription records, lab results, and medical reports.

## Does PawBuck read the documents?

Yes. Our system automatically extracts key information like visit dates, vaccinations, medications, and costs so you don't have to enter everything manually.

## What if my vet doesn't use PawBuck?

That's exactly what the email system solves. Ask your vet to email or CC your pet's PawBuck address when sending documents. No vet integration is required on the clinic side.

## What information is stored in my pet's health profile?

Vaccination records, vet visit history, medications, allergies, dietary requirements, microchip number, vet contact information, and all forwarded documents.

## Can I add information manually?

Yes. You can upload documents, add notes, update details, or add photos anytime in the app from the pet's health record areas.

## How do I share my pet's records?

Use **Download Pet Passport** (or equivalent export in the pet profile / health area) to create a shareable summary you can send to vets, boarders, or caregivers. From the **Health Records** hub you can also tap **Share with vet** to use your device's share sheet with suggested text. Exact menu labels may vary slightly by app version.

## What if I don't have all my pet's past records?

Start fresh and forward documents from now on. You can request past records from your vet anytime and email or upload them into PawBuck.

## How much does PawBuck cost?

Core health record features described in the app store listing apply; optional premium features may exist—check the store listing, in-app upgrade prompts, and **Profile** for current pricing and entitlements.

## How do I get started?

Download the PawBuck app, create your account, and complete onboarding to set up your pet's profile and receive their unique email address.

## Do I need my pet's microchip number?

Not required, but recommended. A microchip helps uniquely identify your pet if they are lost and can match documents to the right pet. You can record it under **Health Records** hub → **Documents & ID** → **Microchip** when you have edit access.

## Can I manage multiple pets?

Yes. Each pet gets their own profile and email address under one account. Switch pets from **Home** or **Profile** using the pet selector.

## Do I need to enter all health information at once?

No. You can build your pet's health history gradually as documents arrive.

## What if I already have paper records or PDFs?

Email them to your pet's PawBuck address or upload them directly in the app. PawBuck organizes them automatically.

$pbdoc_00_general_faq_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"00-general-faq.md"}'::jsonb),
(
$pbdoc_01_home_and_navigation_md$
# Home and navigation

## Bottom navigation

The signed-in app uses a **pill-shaped bar** with four destinations, plus **Milo** as a separate circular control beside the bar (not inside the four slots):

1. **Home** — main dashboard for the selected pet.
2. **Records** — heart-pulse icon; opens the **Health Records** hub for the active pet (uses your selected pet, or the first pet if none is selected).
3. **Messages** — inbox for pet email threads and related conversations.
4. **Profile** — your account, pet management, settings-style rows, help, and sign-out.

Tap the **Milo** avatar next to the bar to open the in-app assistant (some actions may require an active subscription).

## Home screen (typical layout)

With a pet selected, **Home** usually includes, in order:

- **Pet selector** and hero photo (swipe between pets when you have more than one).
- **Talk to Milo** lead card — opens Milo chat.
- **Health briefing** card — opens the pet journal **briefing** flow when available.
- **Pet email** card — copy your pet's **@pawbuck.app** address for forwarding from clinics.
- **Pet Journal** row — log health, behavior, and environment notes.
- **Catch up** — shortcuts into vaccinations, medications, and related health tabs when the product shows them.
- **Body tracker** — weight and body metrics for that pet.
- **Daily walk goal** — compact Pawthon entry; start a walk from here when shown.
- **My Care Team** — veterinarians and other providers you have saved.

Some cards (for example a **weekly challenge** or **book a vet visit** promo) may appear only in certain app versions or when product flags turn them on.

## Home header (top right)

Next to the greeting you may see **Add pet** (plus), **Calendar** (opens **Calendar** — appointments from booking and confirmed email invites), and **Notifications** (alerts when available).

**Profile** is the main place for account editing, pet rows (**View & edit pet profile**, **Add New Pet**, **Claim a Pet**, **Manage Access**, **Transfer Ownership**, **Care Team**), **Reminders** (journal nudge time, insurance/travel expiry pushes, vet appointment pushes), **Settings** rows (**Notifications** opens system settings, **Privacy & Security** info, **Appearance** toggles light/dark), **Help & Support** (**Contact Us**), **Log out**, and **Delete account**.

The old **`/settings` route** immediately sends you back to **Profile** so bookmarks do not hit a dead screen.

## Selecting the active pet

Use the pet picker on **Home** or **Profile** so health data, Milo context, and bottom-bar **Records** navigation use the correct pet.

$pbdoc_01_home_and_navigation_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"01-home-and-navigation.md"}'::jsonb),
(
$pbdoc_02_pet_profile_health_record_md$
# Pet profile and health record

## Opening a pet's health record

From **Home** or **Profile**, choose your pet, then open **View & edit pet profile** (full pet details) or the **Health Records** hub from the bottom bar **Records** (heart-pulse) when that pet is selected.

You can also jump straight to a tab (for example **Vaccinations**) from **Home** Catch up / wellness shortcuts when they appear, or from category cards on the hub screen.

Structured clinical data lives in tabs: **Vaccinations**, **Medications**, **Lab results**, and **Exams**. Broader paperwork (insurance, travel, pedigree, general uploads, invoices) sits in **Documents & ID** on the hub—see the dedicated help article on documents and invoices.

## Health Records hub (dashboard)

The hub screen shows a personalized **Health Records** title for your pet, an optional **attention** banner when items need review, **Download Veterinary Summary** (4-page PDF for clinics), a link to **Health Briefing**, **category cards** that open each health tab (and quick-add routes where the product provides them), then **Documents & ID** below.

From **Pet Profile**, use **Download Pet Passport** for a 3-page travel-oriented PDF (identity, vaccines, handling notes, verify QR).

A **floating action** (plus-style control) on the hub opens **Milo** with health-records context so you can ask questions about that pet's records.

## Uploading documents from health areas

Inside a health **tab** (vaccinations, medications, labs, exams), use **add** or **upload** to pick a photo or PDF. On the hub, use **Documents & ID** → **Add document** for Milo-classified vault uploads (insurance, travel, etc.).

## View-only access

If you were invited with **view-only** access, you can read records but cannot edit or upload on behalf of the owner. The app will indicate read-only mode where relevant.

## During onboarding

If you skipped **date of birth** or **weight** while setting up a pet, those fields may show as **Not set** until you add them in **View & edit pet profile**. Pet inbound mail always uses **@pawbuck.app**; that is separate from marketing or support addresses on **@pawbuck.com**.

$pbdoc_02_pet_profile_health_record_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"02-pet-profile-health-record.md"}'::jsonb),
(
$pbdoc_03_vaccinations_md$
# Vaccinations — how to use PawBuck

## How do I add vaccination records?

1. Select your pet (Home or Profile pet picker).
2. Open the pet's **Health Records** hub, then open the **Vaccinations** tab (from a category card or the tab bar). (Same tab opens if you use a **Home** Catch up shortcut to Vaccinations, or open **Records** in the bottom bar with your pet selected and choose Vaccinations.)
3. Tap **add** or **upload** (wording may be **Add vaccination** or an upload icon).
4. Choose a clear photo or PDF of the certificate or clinic summary.
5. Submit and wait for processing. PawBuck extracts vaccine name, dates, and due dates when possible.
6. Review the vaccination row after processing; fix dates in the detail screen if something looks wrong.

You can also **email** the document to your pet's `@pawbuck.app` address; it will land in messaging / processing flows and can be linked to the health record.

## Overdue vaccines

The vaccinations tab and Milo can highlight **overdue** or upcoming boosters based on dates on file. Always confirm due dates with your veterinarian.

## Editing or deleting a vaccination

Open the **vaccination detail** screen from the list. Use edit controls if you have full access; view-only members cannot change records.

$pbdoc_03_vaccinations_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"03-vaccinations.md"}'::jsonb),
(
$pbdoc_04_medications_labs_exams_md$
# Medications, lab results, and clinical exams

Use the **Health Records** hub → category card, or open **Records** in the bottom bar and pick the tab from the tab bar after drilling in.

## Medications

Open **Health Records** → **Medications** tab. Add or upload prescription or pharmacy paperwork. PawBuck extracts drug names and schedules when possible. Use the medication **detail** screen for refills, notes, or corrections.

## Lab results

Open **Health Records** → **Lab results** tab. Upload PDFs or images of lab reports. After processing, open a **lab detail** view to read values and dates extracted from the document.

## Clinical exams

Open **Health Records** → **Exams** tab. Upload visit summaries or exam notes. Use **exam detail** for a full read-through of parsed content.

## Manual corrections

If extraction is wrong, use in-app edit flows on the detail screens (when you have edit access) or upload a clearer document.

$pbdoc_04_medications_labs_exams_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"04-medications-labs-exams.md"}'::jsonb),
(
$pbdoc_05_messages_pet_email_md$
# Messages and pet email

## Pet email address

Each pet has a unique **@pawbuck.app** address. It appears on **Home** (pet email card when set up), in **Pet profile**, and wherever the product surfaces "copy email" actions. Anyone who sends health documents to that address triggers ingestion into your pet's record and messaging threads.

## Messages inbox

Open **Messages** from the bottom navigation. You will see threads related to your pet's email and care team. **Pending** or **failed** items may appear when an attachment needs review or could not be processed—open the thread and follow resolution prompts.

## Forwarding from your personal email

Forward vet emails to your pet's PawBuck address from your mail app. Keep subject lines clear and include the pet's name if you have multiple pets.

## Review and triage

Some messages require **owner review** (for example unclear attachments). Use the in-app actions to accept, reject, or reassign content according to on-screen instructions.

## Calendar invites (.ics)

When an allowed sender emails your pet’s address and attaches a **calendar invite** (often `.ics` / `text/calendar`), PawBuck may create a **pending** appointment on **Calendar** for you to confirm. This is separate from health-document attachments; confirm or dismiss those rows on **Calendar**.

$pbdoc_05_messages_pet_email_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"05-messages-pet-email.md"}'::jsonb),
(
$pbdoc_06_family_sharing_md$
# Family sharing and household access

## How do I set up family sharing?

1. Open **Profile** → **Manage Access** (Care Team / Family access screen).
2. **Invite by email** (recommended): choose the pet, enter the family member's email, pick access level (**View only**, **Contributor**, or **Admin**), then tap **Send email invite**.
3. **Or share a household code**: tap **Share code** to generate an MTCH code (grants access to **all** your pets when accepted).
4. The invitee signs in with the invited email (for email invites) or enters the MTCH code in **Join household**.

## Joining someone else's household (recipient)

If you were invited:

- **Email link:** open the link (`/accept-invite?token=…`) and sign in with the **same email** that received the invite.
- **MTCH code:** from the welcome screen, Home empty state, or **Profile** → **Join Household**, enter the code at `/join-household`.

You do **not** need to tap **Add New Pet** if you were invited to an existing pet.

## Changing or revoking access

Return to **Manage Access** on the Care Team screen. Remove a household member or send a new email invite with the desired role. Only the pet owner (or admins where allowed) can change access.

## View-only vs contributor vs admin

- **View only** — read health data allowed by policy; no uploads or edits.
- **Contributor** — can add documents and journal entries where the product allows.
- **Admin** — broader manage access on that pet (household MTCH codes grant admin on all owner pets).

$pbdoc_06_family_sharing_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"06-family-sharing.md"}'::jsonb),
(
$pbdoc_07_pet_transfer_md$
# Pet ownership transfer

## How do I start a transfer (current owner)?

1. Open **Profile** → **Transfer Ownership** (sender flow at `/(home)/transfer-pet`).
2. Follow the steps: confirm pet identity, data handling choices, and generate a **TRF transfer code**.
3. Share the code with the new owner. They must accept before ownership moves.

## How do I receive a pet transfer?

1. Ask the current owner for the **TRF transfer code**.
2. In PawBuck, open **Claim a Pet** from Profile, the welcome screen, or Home when you have no pets yet — this opens the **recipient** flow at `/transfer-pet` (not Transfer Ownership).
3. Enter the code, sign in if prompted, review the preview, then accept.
4. After success, the pet appears on Home with health records visible to you as the new owner.

## Declining or canceling

If you started a transfer by mistake, cancel from the sender screen while the code is still active. If the recipient declines, the pet stays with the original owner.

## After transfer

The new owner manages family access going forward. Prior family shares on that pet are cleared at accept time.

$pbdoc_07_pet_transfer_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"07-pet-transfer.md"}'::jsonb),
(
$pbdoc_08_milo_md$
# Milo — in-app assistant

## Opening Milo

- **Bottom bar:** tap the **Milo** dog avatar in the circle **next to** the four main nav icons (Home, Records, Messages, Profile).
- **Home:** use the **Talk to Milo** (or similar) lead card near the top of the feed.
- **Health Records hub:** use the **floating plus-style** control; it opens Milo with **health records** context for that pet.

The chat opens as a **modal** over your current screen. Many shortcuts still require the correct pet to be selected in the app.

## What Milo can do

- Summarize vaccinations, medications, labs, exams, journal notes, and document vault items **for the selected pet** when you have access.
- Answer **how-to** questions using PawBuck help documentation (RAG).
- Help with **document uploads** in flows that send files through Milo-powered classification (for example generic **Add document** on the Health Records hub).

## What Milo cannot do

Milo does not diagnose disease or prescribe doses. For emergencies, contact a veterinarian immediately. Milo is not a substitute for professional veterinary care.

## Subscription or paywall

Some Milo and premium experiences show an **upgrade** or paywall when you tap them. If that happens, follow in-app prompts or review subscription options in the **App Store / Play Store** listing; account and preference controls live under **Profile**.

$pbdoc_08_milo_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"08-milo.md"}'::jsonb),
(
$pbdoc_09_pawthon_walks_md$
# Pawthon and walks

## Starting a walk

From **Home**, use the **daily walk goal** card to see today’s progress, your **last walk**, and **Start a Walk**. After GPS locks, a short **countdown** (5–4–3–2–1–Go) starts tracking. Grant **location** permissions so distance and route are recorded in the background while you walk.

Open **Walk log** from the home card or the **Pawthon** hub to see past walks and tap any entry for the **full route map**, distance, pace, and duration.

## Sharing a walk

After you finish a walk, or from a past walk in **Walk log**, tap **Share story** to preview a **9:16 story card** with your route, distance, duration, pace, pet name, and streak or badge highlights. Tap **Share** to send the image through your phone’s share sheet—for example **Instagram Stories** or **WhatsApp Status**. The card shows your walk path; only share if you are comfortable sharing where you walked.

## Pawthon hub

From **Home** → weekly challenge card (or **Pawthon** in navigation), view lifetime **walks** and **miles**, your **streak**, recent walks, **badges**, and **walk reminders**. **Badges** unlock after walks (first walk, streaks, milestones). **Reminders** are optional local notifications for daily walks and streak protection.

## Leaderboard

The **weekly challenge** card appears on Home only when enough pet owners in **your pet’s country** are on PawBuck (same country as on your pet profile). It shows your week’s distance and local rank. Otherwise use **Walk log** on the daily goal card or Pawthon hub for past routes and stats.

## Simulator note

iOS Simulator and some Android emulators may not provide real GPS; walks and distance can be incomplete. Test walks on a physical device for accurate metrics.

$pbdoc_09_pawthon_walks_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"09-pawthon-walks.md"}'::jsonb),
(
$pbdoc_10_book_vet_visit_md$
# Book a vet visit

## Flow overview

PawBuck can connect you to clinic scheduling partners depending on region and clinic configuration. The wizard lives under **Book vet visit** in the app stack (`/(home)/book-vet-visit` and follow-on screens).

A prominent **Book a vet visit** card on **Home** may be **hidden** in some builds (feature flag); if you do not see it, you may still reach booking through product links, future UI entry points, or support guidance for your version.

1. Open **Book vet visit** when your app shows that entry point.
2. **Select service** (wellness, sick visit, etc.) when asked.
3. **Pick date and time** from available slots.
4. Confirm details on the **booking confirmed** screen. From there you can open **View Appointments** to go to the **Calendar** tab.

## Calendar (appointments)

Open **Calendar** from the **calendar** icon on **Home** (top right), or from **View Appointments** after you book.

- **In-app bookings** — visits you book through PawBuck appear as confirmed appointments.
- **Email calendar invites** — when a trusted sender emails your pet’s **@pawbuck.app** address and the message includes a standard **calendar file (.ics)**, PawBuck may add a row under **Needs confirmation**. Check the date and time, then tap **Confirm** so reminders apply, or **Dismiss** if it is wrong or duplicate.
- **Phone calendar** — on supported devices, use **Add to phone calendar** on a confirmed row to copy the event into your device calendar (you will be asked for permission).

Use **Book a vet visit** from Calendar to start a new booking.

## If no clinics appear

Availability depends on integrated clinics. Try another location, another clinic, or contact support if booking repeatedly fails.

## Cancellations and changes

Use the confirmation screen or appointment management links provided after booking. Policies follow the clinic and scheduling vendor.

$pbdoc_10_book_vet_visit_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"10-book-vet-visit.md"}'::jsonb),
(
$pbdoc_11_pet_journal_md$
# Pet journal

## What the journal is for

The **Pet journal** captures owner observations: health notes, behavior, environment, and optional **briefing** style summaries. It complements structured health records (vaccines, labs).

## Adding an entry

From **Home**, use the **Pet Journal** row ("Log health, behavior & environment") or open **Pet Journal** from navigation you already use. The **Health briefing** card on Home opens the **briefing** flow for that pet when available.

Tap **new** or **add** to create an entry, pick a domain (for example **health**), subtype, date, and note text. Save the entry.

## Allergies and conditions

Dedicated flows exist for **add allergy** and **add condition** from the journal area—use those for long-lived conditions so they appear consistently in pet context.

## Behavior baseline ("normal for this pet")

The journal screen shows a **Set behavior baseline** row near the top (it switches to **Behavior baseline saved** once you finish it). Tapping it opens a short, six-question setup that captures **what's normal** for your pet across:

- **Energy** — a 1–5 cruising-speed scale (couch potato → always on the move).
- **Social disposition** — social butterfly, indifferent, or selective with people / other pets.
- **Food motivation** — high, normal, or finicky.
- **Sleep** — typical deep-sleep hours, restfulness (restful / restless / mixed), and a safe spot.
- **Vocalization** — quiet, occasional alerts, or very talkative.
- **Top 3 mood changers** — stress triggers like thunderstorms, fireworks, vet visits, strangers (capped at 3).

Saving stores one baseline per pet. PawBuck and Milo use this to **notice changes vs usual** when you log a journal entry (for example, "skipped two meals" reads differently for a high-food-motivation dog than a finicky one). You can update the baseline any time; if a pet is transferred to another household, the baseline travels with the pet and the new owner can review or reset it.

## Milo journal mode

When you open **Milo** for a journal check-in, the assistant runs a short **structured interview**. It introduces itself as **Milo AI** (or **Milo**) only when your **pet's name is Milo**; otherwise it uses **PawBuck's journal helper**.

### Tree-driven interviews (v1.5, when enabled)

1. **Context surfacing** — Milo shows what it already knows from your pet's record (vaccines, meds, prior notes) and any medication flags. Tap **Looks right — continue** to start questions.
2. **Clinical questions** (about 4–6) — Topic-specific chips (e.g. vomiting: timing, what it looks like, appetite, triggers).
3. **Structured summary** — SOAP-style fields you can review and edit before save.
4. **Share with vet** — Teal action to email your vet with an ask (FYI / please advise / urgent).

## Veterinary Summary PDF

From **Health Briefing** (or **Health Records** hub), tap **Download Veterinary Summary** to generate a 4-page PDF aligned with PawBuck’s vet summary format: clinical snapshot, vaccines, timeline, and insurance/behavior appendix when data exists. Valid for 14 days from generation.

Enable via admin **Milo journal** settings: **tree-driven journal interviews**. The app also respects `EXPO_PUBLIC_JOURNAL_TREE_INTERVIEW=true` for early testing.

### Legacy checklist mode (fallback)

If tree mode is off, the interview follows **five phases**: frame, symptom detail, contextual scan, red-flag screen, confirm.

- Each step offers **quick-reply chips**; every chip set includes **Not sure** and **+ Add details**.
- Emergencies stop the interview without saving until you seek care.
- After **confirm**, the saved note uses everyday wording; vet messaging uses separate clinical copy.

$pbdoc_11_pet_journal_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"11-pet-journal.md"}'::jsonb),
(
$pbdoc_12_settings_notifications_md$
# Settings and notifications

## Where everything lives

There is **no standalone Settings screen** in current builds: the **`/settings` route** redirects to **Profile**. Use **Profile** for account hero (edit phone/address), **My Pets**, **Reminders**, **Settings** rows, **Help & Support**, **Log out**, and **Delete account**.

## Notifications (system)

Under **Profile** → **Settings** list, tap **Notifications** → **Manage alerts** to open the **iOS / Android system Settings** page for PawBuck so you can allow or deny push and banners. If the OS cannot open settings, the app shows a short message telling you to open Settings manually.

Push may be limited or absent on simulators.

## Reminders (in Profile)

The **Reminders** section (between **My Pets** and the **Settings** list) controls:

- **Daily journal prompt** — local notification on this device (default **8 PM**); you can pick an evening hour or turn the prompt off.
- **Insurance & travel expiry alerts** — server push when a saved policy or certificate is nearing expiry (staged reminders such as 30, 7, and 1 days, plus day-of, depending on product configuration).
- **Vet appointment alerts** — push about **24 hours** and about **1 hour** before a **confirmed** in-app booking, when enabled.

Toggling these updates your saved preferences and refreshes scheduled notifications where applicable.

## Appearance

Under **Profile** → **Settings**, **Appearance** toggles **light** and **dark** each time you tap (the row subtitle may mention system default in some builds; behavior is a light/dark flip in the current theme provider).

## Privacy row

**Privacy & Security** opens a short in-app summary; for deeper questions, use **Contact Us** under Help & Support.

$pbdoc_12_settings_notifications_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"12-settings-notifications.md"}'::jsonb),
(
$pbdoc_13_account_privacy_md$
# Account, privacy, and data deletion

## Signing out

From **Profile**, use **Log out** and confirm. You will need to sign in again to access pets.

## Deleting your account

From **Profile**, scroll to the **Danger zone** and use **Delete account**. Follow the confirmation flow; active pet transfers may be called out before you can proceed. Deletion is permanent for that account's data per product policy. For questions before deleting, use **Contact Us** under Help & Support.

## Privacy summary

Health data is stored securely. Review the privacy policy linked from the app or website for categories of data collected and sharing practices.

## Apple Sign-In and Google

You can sign in with email/password or supported OAuth providers. On Android emulators, Google Sign-In requires correct OAuth configuration (developer setup).

$pbdoc_13_account_privacy_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"13-account-privacy.md"}'::jsonb),
(
$pbdoc_14_contact_support_md$
# Contact support

## In-app messaging

Open **Contact Us** from **Profile** under **Help & Support**. Send a message describing your issue, device type, and pet name if relevant. Support responds through the same thread when available.

## When to contact support vs Milo

- **Milo**: how-to, feature explanations, and summarizing your authorized pet data.
- **Support**: billing failures, account lockouts, bugs, transfer issues that block you, or data requests not handled by self-serve flows.

## Urgent pet health

For emergencies, call an emergency veterinarian or local clinic. Do not wait for chat support.

$pbdoc_14_contact_support_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"14-contact-support.md"}'::jsonb),
(
$pbdoc_15_documents_id_invoices_md$
# Documents, ID, microchip, and invoices

## Where this lives

On the **Health Records** hub for a pet (bottom bar **Records** / heart-pulse with that pet selected, or other shortcuts into health), scroll past the category cards (vaccinations, medications, labs, exams). The **Documents & ID** area groups non-tab health paperwork.

## Microchip and ID

Expand **Microchip** to view or add your pet's microchip number when you have edit access. This helps identify your pet and match incoming documents.

## Insurance, pedigree, travel, and other files

Use **Add document** (or equivalent) to upload a **photo or PDF**. Milo classifies the file and extracts key details where possible. Common types include **insurance policy**, **pedigree**, **travel certificate**, and other registration or legal paperwork—each appears in its own subsection when recognized.

## Financial / invoices

The **Invoices & Billing** subsection (same hub, below other document groups) is where billing PDFs or photos belong. After processing, totals and line items may appear in the list when extraction succeeds. Upload clear scans or PDFs for best results.

## Sharing with your vet

From the Health Records hub, use **Share with vet** to open your device's share sheet with suggested text you can send to a clinic or caregiver (exact wording is provided in-app).

$pbdoc_15_documents_id_invoices_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"15-documents-id-invoices.md"}'::jsonb)
) AS v(content, metadata)
CROSS JOIN zero_emb z;

COMMIT;
