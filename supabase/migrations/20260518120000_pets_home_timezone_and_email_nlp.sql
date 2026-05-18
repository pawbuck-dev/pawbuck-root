-- Pet home timezone for interpreting inbox appointment wall times; NLP email calendar imports.

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS home_timezone text;

COMMENT ON COLUMN public.pets.home_timezone IS
  'IANA timezone (e.g. America/Toronto) for interpreting pet inbox appointment times; null uses country fallback in Edge.';

ALTER TABLE public.vet_bookings
  DROP CONSTRAINT IF EXISTS vet_bookings_booking_source_check;

ALTER TABLE public.vet_bookings
  ADD CONSTRAINT vet_bookings_booking_source_check
  CHECK (booking_source IN ('in_app', 'email_ics', 'email_nlp'));

COMMENT ON COLUMN public.vet_bookings.booking_source IS
  'in_app = PawBuck booking; email_ics = calendar attachment; email_nlp = LLM extraction from message body.';
