-- Appointments booked through PawBuck (demo adapter, Vetstoria, EazyVet, etc.)

CREATE TABLE IF NOT EXISTS public.vet_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets (id) ON DELETE SET NULL,
  clinic_id text NOT NULL,
  clinic_name text,
  service_id text NOT NULL,
  service_label text,
  start_utc timestamptz NOT NULL,
  end_utc timestamptz NOT NULL,
  external_appointment_id text,
  pawbuck_appointment_id uuid,
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS vet_bookings_user_id_created_at_idx
  ON public.vet_bookings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vet_bookings_pet_id_idx ON public.vet_bookings (pet_id);

COMMENT ON TABLE public.vet_bookings IS 'Vet appointments created via in-app booking flow; synced after PawBuck.API book call.';

ALTER TABLE public.vet_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vet_bookings_select_own"
  ON public.vet_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "vet_bookings_insert_own"
  ON public.vet_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vet_bookings_update_own"
  ON public.vet_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vet_bookings_delete_own"
  ON public.vet_bookings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.vet_bookings TO authenticated;
GRANT ALL ON TABLE public.vet_bookings TO service_role;
