# PawBuck → Vet Notification Format Spec (Milo AI)

**Version:** 1.0  
**Date:** 2026-05-10  

This document defines how Milo AI should compose messages PawBuck sends to a verified vet on behalf of a pet parent. It includes (1) what is wrong with naive outputs, (2) the new template, (3) worked examples, (4) input data schema, (5) generation rules, and (6) a few-shot prompt block for the model system message.

Canonical few-shot prompt text for engineering copy-paste: [vet-notification-few-shot-system.md](./vet-notification-few-shot-system.md).

---

## 1. What is wrong with naive outputs

1. **Wrong sender attribution** — The platform must not sign as “PawBuck”; the pet parent signs; PawBuck is named in the footer as the channel.
2. **Lead is buried** — First line must answer who, what, how urgent, what is the ask (vets triage in seconds).
3. **Markdown leaking** — `**Observations:**` must not appear raw in clinic inboxes; use plain text (ALL CAPS section headers, line breaks) or render server-side before send.
4. **Duplicate observations** — If free text matches a chip, free text wins; chip is taxonomy-only, not duplicated in the body.
5. **Separate clinical issues** — Do not merge unrelated clusters (e.g. GI + MSK); each observation block is one issue with its own onset/trend.
6. **Vague context** — Drop “since the trip” unless trip date/location exists in data.
7. **No urgency signal** — Use explicit triage tags (see §2.1); never “Emergency” on async email (see §3.3).
8. **Pet metadata** — Pre-populate age, sex, weight, microchip, vaccines, meds, last visit when available from the record; do not fabricate.
9. **Assistant naming** — Use “Milo AI” or “PawBuck’s journal helper”, never `{petName}'s journal helper`.
10. **Subject line** — Must encode pet, key symptom, urgency for inbox list view.
11. **Reply mechanism** — Footer: reply routes to the pet’s record; include stable deep link when product provides `recordId`.

---

## 2. The new format (summary)

### 2.1 Subject line

`{PetName} ({Breed}, {Age}{Sex/Neuter}) · {one-line summary} · {Urgency tag}`

- Max **70** characters; truncate one-line summary first.
- Urgency tag (email-safe): `FYI` | `Advice requested` | `Please advise within 24h` | `Sameday callback requested`.
- No emoji; no exclamation marks in subject.

### 2.2 Header block (plain text)

Fixed labels: `PET`, `PET ID`, `OWNER`, `PREFERRED`, `LOGGED`, `URGENCY` (see worked examples in few-shot doc).

### 2.3 One-line summary

Single sentence, clinical-but-readable, begins with pet name; max **25** words; no filler (“I hope this finds you well”).

### 2.4 Structured observations

One block per observation; order by clinical severity; `What:` uses free text only (deduped vs chip per §4).

### 2.5 Negative findings

`Owner reports normal: …` (comma-separated).

### 2.6 Medical context

`LAST VISIT`, `VACCINES`, `MEDICATIONS`, `ALLERGIES` from record only; optional `INSURANCE`, `WEIGHT TREND` when present.

### 2.7 The ask

One sentence; default to exam vs home monitoring framing when unspecified.

### 2.8 Footer

Reply instruction, `View full journal: https://pawbuck.com/r/{recordId}` when available, disclaimers, Milo AI / PawBuck channel wording.

### 2.9 Sign-off

`{OwnerName}` then `{PetName}'s parent · sent via PawBuck`.

---

## 3. Examples and emergency rule

- **Routine (FYI)** and **Advice requested** — see [vet-notification-few-shot-system.md](./vet-notification-few-shot-system.md).
- **Emergency** — Do **not** send email; show call-first UI; observations persist for post-call follow-up. Post-call subject example: `… · Follow-up to {time} emergency call · Record of observations`.

---

## 4. Input data schema (JSON)

The model receives structured JSON. Required minimum for generation: `pet.name`, `observations[]`, `triage.level`. All other fields optional; **omit** lines when missing (no fabrication).

See TypeScript types `VetNotificationPayload` in `apps/consumer-app/types/vetNotification.ts` and API DTOs `MiloVetNotificationPayloadDto` in `backend/PawBuck.API/Models/` for the implemented subset aligned with this spec.

---

## 5. Generation rules

1. **Triage gate** — If `triage.level == emergency`, do not generate email; UI shows call flow. Low confidence: review + optional hedge on URGENCY line.
2. **Markdown** — Output plain text for clinic channel; strip bold/markdown from journal-derived text when composing vet email.
3. **Naming** — Milo AI / PawBuck channel; owner signs.
4. **Dedup** — `userText` wins over `primaryChip` in rendered `What:`.
5. **No fabrication** — Omit unknown severity/trend lines.
6. **Tone** — Vet-clinical, active voice, no Victorian filler.
7. **Length** — Target 35–55 lines; trim medical context / compress negatives before dropping observations.

---

## 6. Few-shot prompt

Verbatim block for system messages: **[vet-notification-few-shot-system.md](./vet-notification-few-shot-system.md)**.

---

## 7. Open questions (product / infra)

1. Auto-send vs always review (+ per-vet toggles).
2. Vet domain verification before auto-send.
3. Reply ingestion and threading on pet email.
4. Localization (clinic vs owner language).
5. Photo / video attachments policy.

---

## Implementation checklist

| Item | Location |
|------|----------|
| Client plain-text compose | `apps/consumer-app/utils/buildVetMessageFromJournalSession.ts` |
| Emergency compose gate | `apps/consumer-app/app/(home)/milo.tsx` |
| API journal structured payload | `MiloReasoningService.RunJournalInterviewAsync`, `MiloChatResponse` |
| Optional server draft | `POST /api/Milo/vet-notification-draft` (authorized; body: `MiloVetNotificationDraftRequest`) |

End of spec v1.0 (repository copy).
