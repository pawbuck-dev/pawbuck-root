-- Notifications strategy 5.4: user reminder prefs, document expiry column, idempotency tables.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS journal_prompt_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS journal_prompt_hour integer NOT NULL DEFAULT 20
    CONSTRAINT journal_prompt_hour_chk CHECK (journal_prompt_hour >= 0 AND journal_prompt_hour <= 23),
  ADD COLUMN IF NOT EXISTS journal_prompt_minute integer NOT NULL DEFAULT 0
    CONSTRAINT journal_prompt_minute_chk CHECK (journal_prompt_minute >= 0 AND journal_prompt_minute <= 59),
  ADD COLUMN IF NOT EXISTS document_expiry_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vet_appointment_reminder_push_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.pet_documents
  ADD COLUMN IF NOT EXISTS expiry_date date;

CREATE INDEX IF NOT EXISTS pet_documents_expiry_date_idx
  ON public.pet_documents (expiry_date)
  WHERE expiry_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.document_expiry_reminder_sent (
  pet_document_id uuid NOT NULL REFERENCES public.pet_documents (id) ON DELETE CASCADE,
  bucket text NOT NULL CHECK (bucket = ANY (ARRAY['30'::text, '7'::text, '1'::text, '0'::text])),
  sent_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (pet_document_id, bucket)
);

ALTER TABLE public.document_expiry_reminder_sent ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vet_booking_reminder_sent (
  vet_booking_id uuid NOT NULL REFERENCES public.vet_bookings (id) ON DELETE CASCADE,
  reminder_window text NOT NULL CHECK (reminder_window = ANY (ARRAY['24h'::text, '1h'::text])),
  sent_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (vet_booking_id, reminder_window)
);

ALTER TABLE public.vet_booking_reminder_sent ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.document_expiry_reminder_sent IS 'Dedupe server pushes for insurance/travel document expiry reminders.';
COMMENT ON TABLE public.vet_booking_reminder_sent IS 'Dedupe server pushes for vet_bookings T-24h / T-1h reminders.';

CREATE OR REPLACE FUNCTION public.create_user_preferences(p_user_id uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Best-effort backfill expiry_date from Milo primaryDate (YYYY-MM-DD or ISO datetime prefix).
UPDATE public.pet_documents d
SET expiry_date = to_date(substring((d.extracted_json->>'primaryDate') from 1 for 10), 'YYYY-MM-DD')
WHERE d.expiry_date IS NULL
  AND (d.extracted_json->>'primaryDate') IS NOT NULL
  AND substring((d.extracted_json->>'primaryDate') from 1 for 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
