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

Use **Download Pet Passport** (or equivalent export in the pet profile / health area) to create a shareable summary you can send to vets, boarders, or caregivers. Exact menu labels may vary slightly by app version.

## What if I don't have all my pet's past records?

Start fresh and forward documents from now on. You can request past records from your vet anytime and email or upload them into PawBuck.

## How much does PawBuck cost?

Core health record features described in the app store listing apply; optional premium features may exist—check **Settings** and in-app subscription messaging for current pricing.

## How do I get started?

Download the PawBuck app, create your account, and complete onboarding to set up your pet's profile and receive their unique email address.

## Do I need my pet's microchip number?

Not required, but recommended. A microchip helps uniquely identify your pet if they are lost and can match documents to the right pet.

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

The main app uses a bottom tab bar (typical tabs: **Home**, health or pet hub, **Messages**, **Milo**, **Profile**). Use the tabs to move between major areas without losing your signed-in session.

## Home screen

**Home** shows your selected pet, quick actions, and entry points to health, walks, and other features. If you have multiple pets, select the active pet from the pet picker on Home or Profile so Milo and health data use the correct pet.

## Profile vs Settings

**Profile** shows your account card, pet shortcuts, help links, and theme. **Settings** (gear from Profile or the settings entry) lists account options, care team, help, and onboarding reset.

$pbdoc_01_home_and_navigation_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"01-home-and-navigation.md"}'::jsonb),
(
$pbdoc_02_pet_profile_health_record_md$
# Pet profile and health record

## Opening a pet's health record

From **Home** or **Profile**, choose your pet, then open **Pet profile** or the **Health record** hub for that pet. The health record groups vaccinations, medications, lab results, and clinical exams.

## Uploading documents from health areas

Inside a health section (vaccinations, medications, labs, exams), use the **upload** or **add** actions to pick a photo or PDF from your device. Follow on-screen prompts to confirm the pet and document type.

## View-only access

If you were invited with **view-only** access, you can read records but cannot edit or upload on behalf of the owner. The app will indicate read-only mode where relevant.

$pbdoc_02_pet_profile_health_record_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"02-pet-profile-health-record.md"}'::jsonb),
(
$pbdoc_03_vaccinations_md$
# Vaccinations — how to use PawBuck

## How do I add vaccination records?

1. Select your pet (Home or Profile pet picker).
2. Open the pet's **Health record**, then the **Vaccinations** tab.
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

## Medications

Open **Health record** → **Medications**. Add or upload prescription or pharmacy paperwork. PawBuck extracts drug names and schedules when possible. Use the medication **detail** screen for refills, notes, or corrections.

## Lab results

Open **Health record** → **Lab results**. Upload PDFs or images of lab reports. After processing, open a **lab detail** view to read values and dates extracted from the document.

## Clinical exams

Open **Health record** → **Exams** (or **Clinical exams**). Upload visit summaries or exam notes. Use **exam detail** for a full read-through of parsed content.

## Manual corrections

If extraction is wrong, use in-app edit flows on the detail screens (when you have edit access) or upload a clearer document.

$pbdoc_04_medications_labs_exams_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"04-medications-labs-exams.md"}'::jsonb),
(
$pbdoc_05_messages_pet_email_md$
# Messages and pet email

## Pet email address

Each pet has a unique **@pawbuck.app** address shown on the pet profile. Anyone who sends health documents to that address triggers ingestion into your pet's record and messaging threads.

## Messages inbox

Open **Messages** from the bottom navigation. You will see threads related to your pet's email and care team. **Pending** or **failed** items may appear when an attachment needs review or could not be processed—open the thread and follow resolution prompts.

## Forwarding from your personal email

Forward vet emails to your pet's PawBuck address from your mail app. Keep subject lines clear and include the pet's name if you have multiple pets.

## Review and triage

Some messages require **owner review** (for example unclear attachments). Use the in-app actions to accept, reject, or reassign content according to on-screen instructions.

$pbdoc_05_messages_pet_email_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"05-messages-pet-email.md"}'::jsonb),
(
$pbdoc_06_family_sharing_md$
# Family sharing and household access

## How do I set up family sharing?

1. Select the pet that should be shared.
2. Open **Profile** → **Manage Access** (or **Family access** / **Care team** from profile shortcuts—labels point to the same `family-access` area).
3. Invite a family member by email or use the app's invite flow.
4. Choose permission level if offered (for example **full access** vs **view-only**).
5. The invitee accepts the invite in email or the app and signs in with their PawBuck account.

## Joining someone else's household

If you received an invite, open the link or use **Join household** from onboarding or the join flow (`join-household`) and enter the code or token you were given.

## Changing or revoking access

Return to **Manage Access / Family access** for that pet. Remove a member or downgrade permissions according to the controls shown. Only owners (or users with manage permission) can change access.

## View-only vs full access

**View-only** can read health data and messages allowed by policy but cannot upload or edit clinical rows. **Full** (or equivalent) access can add documents and journal entries where the product allows.

$pbdoc_06_family_sharing_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"06-family-sharing.md"}'::jsonb),
(
$pbdoc_07_pet_transfer_md$
# Pet ownership transfer

## How do I start a transfer (current owner)?

1. Open **Profile** → **Transfer Ownership** (or **Claim a Pet** inverse flow from the transferee side).
2. Follow **Transfer pet** steps: confirm pet identity, data handling choices if shown, and generate or share a **secure transfer code** or link as the app presents.
3. Complete any confirmation steps. The recipient must accept before ownership fully moves.

## How do I receive a pet transfer?

1. Ask the current owner for the **transfer code** or invite link.
2. In PawBuck, go to **Claim a Pet** / **Transfer pet** and enter the code or open the link.
3. Sign in to the account that should receive the pet.
4. Review warnings about historical data and future access, then confirm acceptance.
5. After success, select the new pet from your pet list and verify health records and messages.

## Declining or canceling

If you started a transfer by mistake, use in-app **cancel** or decline options while the transfer is still pending. If the other party declines, the pet stays with the original owner.

## After transfer

Update family access if other caregivers still need visibility. The new owner manages invites going forward.

$pbdoc_07_pet_transfer_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"07-pet-transfer.md"}'::jsonb),
(
$pbdoc_08_milo_md$
# Milo — in-app assistant

## Opening Milo

Use the **Milo** tab or floating Milo entry (if shown). A **Milo chat** modal may open from multiple screens; you can ask about your pet's records (when a pet is selected) or about how to use PawBuck.

## What Milo can do

- Summarize vaccinations, medications, labs, exams, and journal notes **for the selected pet** when you have access.
- Answer **how-to** questions using PawBuck help documentation.
- Attach or link to documents when the product returns file chips from your authorized records.

## What Milo cannot do

Milo does not diagnose disease or prescribe doses. For emergencies, contact a veterinarian immediately. Milo is not a substitute for professional veterinary care.

## Subscription or paywall

Some Milo features may require an active subscription. If you see a paywall, follow in-app prompts or check **Settings** / subscription cards.

$pbdoc_08_milo_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"08-milo.md"}'::jsonb),
(
$pbdoc_09_pawthon_walks_md$
# Pawthon and walks

## Starting a walk

From **Home** or the **Pawthon** area, start a **walk** session when prompted. Grant **location** permissions so distance and route metrics can be recorded. Location is used while the walk is active according to system permission prompts.

## Leaderboard

Open **Leaderboard** from Pawthon-related navigation to compare progress with challenges described in the product. Rankings depend on recorded activity.

## Simulator note

iOS Simulator and some Android emulators may not provide real GPS; walks and distance can be incomplete. Test walks on a physical device for accurate metrics.

$pbdoc_09_pawthon_walks_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"09-pawthon-walks.md"}'::jsonb),
(
$pbdoc_10_book_vet_visit_md$
# Book a vet visit

## Flow overview

PawBuck can connect you to clinic scheduling partners depending on region and clinic configuration.

1. Open **Book vet visit** from the home or health entry point.
2. **Select service** (wellness, sick visit, etc.) when asked.
3. **Pick date and time** from available slots.
4. Confirm details on the **booking confirmed** screen.

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

Open **Pet Journal** from Profile shortcuts or navigation. Tap **new** or **add** to create an entry, pick a domain (for example **health**), subtype, date, and note text. Save the entry.

## Allergies and conditions

Dedicated flows exist for **add allergy** and **add condition** from the journal area—use those for long-lived conditions so they appear consistently in pet context.

## Milo journal mode

Milo may offer a **journal interview** style chat for structured check-ins when enabled. Follow Milo's prompts; answers are saved according to journal privacy settings.

$pbdoc_11_pet_journal_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"11-pet-journal.md"}'::jsonb),
(
$pbdoc_12_settings_notifications_md$
# Settings and notifications

## Opening Settings

From **Profile**, tap the **settings** (gear) icon. Settings includes account summary, care team shortcut, help, contact, and **re-show onboarding**.

## Notifications

Use the **Notifications** row to jump to **system Settings** for PawBuck on your device. Enable alerts for reminders (medications, vaccines, messages) as desired. Push may be limited on simulators.

## Appearance

Toggle **light**, **dark**, or **system** appearance from the Appearance row in Profile settings.

## Re-show onboarding

Clears onboarding modal flags so tips can appear again—confirm in the alert before proceeding.

$pbdoc_12_settings_notifications_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"12-settings-notifications.md"}'::jsonb),
(
$pbdoc_13_account_privacy_md$
# Account, privacy, and data deletion

## Signing out

From **Profile**, use **Log out** and confirm. You will need to sign in again to access pets.

## Deleting your account

If the app offers **Delete account** in Settings or Profile legal sections, follow the confirmation flow. Deletion is permanent for that account's data per product policy. For questions before deleting, use **Contact Us**.

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

Open **Contact Us** from **Settings** or **Profile** help section. Send a message describing your issue, device type, and pet name if relevant. Support responds through the same thread when available.

## When to contact support vs Milo

- **Milo**: how-to, feature explanations, and summarizing your authorized pet data.
- **Support**: billing failures, account lockouts, bugs, transfer issues that block you, or data requests not handled by self-serve flows.

## Urgent pet health

For emergencies, call an emergency veterinarian or local clinic. Do not wait for chat support.

$pbdoc_14_contact_support_md$,
  '{"corpus":"pawbuck-product-help-manual","source_file":"14-contact-support.md"}'::jsonb)
) AS v(content, metadata)
CROSS JOIN zero_emb z;

COMMIT;
