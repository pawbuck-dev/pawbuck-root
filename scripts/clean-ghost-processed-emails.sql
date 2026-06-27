-- One-time cleanup: false-success processed_emails rows
-- (message text ingested, zero attachments filed, marked success=true / resolved)
--
-- Run in Supabase Dashboard → SQL Editor (production project).
-- 1) Run STEP 1 (preview) and confirm rows match expectations.
-- 2) Uncomment and run STEP 2 (delete) if the preview looks correct.
--
-- Does NOT delete Messages threads (message_threads / thread_messages).

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1 — PREVIEW (run this first)
-- Edit pet_name / from_ts / to_ts in the params CTE as needed.
-- ═══════════════════════════════════════════════════════════════════════════

WITH params AS (
  SELECT
    'Milo'::text AS pet_name,           -- NULL = all pets
    '2026-05-28T00:00:00+00'::timestamptz AS from_ts,  -- NULL = no lower bound
    '2026-06-28T00:00:00+00'::timestamptz AS to_ts     -- NULL = no upper bound
)
SELECT
  pe.id,
  pe.completed_at,
  pe.subject,
  pe.sender_email,
  p.name AS pet_name,
  pe.pet_id,
  pe.success,
  pe.review_status,
  pe.document_type,
  pe.attachment_count,
  pe.failure_reason
FROM public.processed_emails pe
LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
CROSS JOIN params par
WHERE pe.status = 'completed'
  AND pe.success IS TRUE
  AND COALESCE(pe.review_status, '') = 'resolved'
  AND NULLIF(trim(pe.failure_reason), '') IS NULL
  AND NULLIF(trim(pe.document_type), '') IS NULL
  AND COALESCE(pe.attachment_count, 0) = 0
  AND (par.pet_name IS NULL OR p.name ILIKE par.pet_name)
  AND (par.from_ts IS NULL OR pe.completed_at >= par.from_ts)
  AND (par.to_ts IS NULL OR pe.completed_at < par.to_ts)
ORDER BY pe.completed_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2 — DELETE (run only after preview looks correct)
-- ═══════════════════════════════════════════════════════════════════════════

/*
WITH params AS (
  SELECT
    'Milo'::text AS pet_name,
    '2026-05-28T00:00:00+00'::timestamptz AS from_ts,
    '2026-06-28T00:00:00+00'::timestamptz AS to_ts
),
candidates AS (
  SELECT pe.id
  FROM public.processed_emails pe
  LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
  CROSS JOIN params par
  WHERE pe.status = 'completed'
    AND pe.success IS TRUE
    AND COALESCE(pe.review_status, '') = 'resolved'
    AND NULLIF(trim(pe.failure_reason), '') IS NULL
    AND NULLIF(trim(pe.document_type), '') IS NULL
    AND COALESCE(pe.attachment_count, 0) = 0
    AND (par.pet_name IS NULL OR p.name ILIKE par.pet_name)
    AND (par.from_ts IS NULL OR pe.completed_at >= par.from_ts)
    AND (par.to_ts IS NULL OR pe.completed_at < par.to_ts)
)
DELETE FROM public.processed_emails pe
USING candidates c
WHERE pe.id = c.id
RETURNING pe.id, pe.subject, pe.completed_at, pe.pet_id;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- OPTIONAL — delete known row IDs only (safest if preview matched 3 rows)
-- ═══════════════════════════════════════════════════════════════════════════

/*
DELETE FROM public.processed_emails
WHERE id IN (
  '75b5d6ab-76fb-414e-9729-f0538e72540d'::uuid,
  'e5daf0c9-e21f-40b3-9dd9-7ebba3087b03'::uuid,
  '80f04495-0de9-42da-99ef-41dad5eb1d69'::uuid
)
RETURNING id, subject, completed_at, pet_id;
*/
