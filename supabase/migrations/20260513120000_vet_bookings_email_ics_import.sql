-- Email ICS imports: track source, idempotency, optional link to inbound thread message.

ALTER TABLE public.vet_bookings
  ADD COLUMN IF NOT EXISTS booking_source text NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS ics_uid text,
  ADD COLUMN IF NOT EXISTS email_import_key text,
  ADD COLUMN IF NOT EXISTS thread_message_id uuid REFERENCES public.thread_messages (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.vet_bookings.booking_source IS 'in_app = PawBuck booking flow; email_ics = calendar invite from pet inbox pipeline.';
COMMENT ON COLUMN public.vet_bookings.ics_uid IS 'VEVENT UID from ICS when booking_source = email_ics.';
COMMENT ON COLUMN public.vet_bookings.email_import_key IS 'Idempotency key (e.g. S3 fileKey + ics_uid + event index) for email imports.';
COMMENT ON COLUMN public.vet_bookings.thread_message_id IS 'Inbound thread_messages row associated with this import, when available.';

ALTER TABLE public.vet_bookings
  DROP CONSTRAINT IF EXISTS vet_bookings_booking_source_check;

ALTER TABLE public.vet_bookings
  ADD CONSTRAINT vet_bookings_booking_source_check
  CHECK (booking_source IN ('in_app', 'email_ics'));

-- Allow pending user review before T-24h / T-1h reminders (status must stay ''confirmed'' for those pushes).
ALTER TABLE public.vet_bookings
  DROP CONSTRAINT IF EXISTS vet_bookings_status_check;

ALTER TABLE public.vet_bookings
  ADD CONSTRAINT vet_bookings_status_check
  CHECK (
    status IN (
      'confirmed',
      'pending_confirmation',
      'cancelled'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS vet_bookings_email_import_key_uidx
  ON public.vet_bookings (email_import_key)
  WHERE email_import_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS vet_bookings_user_status_start_idx
  ON public.vet_bookings (user_id, status, start_utc DESC);

CREATE INDEX IF NOT EXISTS vet_bookings_pet_start_idx
  ON public.vet_bookings (pet_id, start_utc DESC)
  WHERE pet_id IS NOT NULL;
