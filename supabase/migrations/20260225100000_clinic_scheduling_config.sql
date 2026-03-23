-- Clinic → scheduling vendor routing for PawBuck.API (read via Postgres connection string).
-- Mobile apps do not call vendors directly; API loads this table when Scheduling:UseSupabaseClinicConfig is true.

CREATE TABLE IF NOT EXISTS public.clinic_scheduling_config (
  clinic_id uuid PRIMARY KEY,
  provider_kind text NOT NULL CHECK (provider_kind IN ('PawBuckDemo', 'Vetstoria', 'EazyVet')),
  external_clinic_id text,
  integration_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.clinic_scheduling_config IS 'Maps PawBuck clinic UUID to scheduling adapter; used by PawBuck.API SupabaseClinicSchedulingConfigProvider.';

ALTER TABLE public.clinic_scheduling_config ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon: API uses database owner / service connection that bypasses RLS for this table.

GRANT ALL ON TABLE public.clinic_scheduling_config TO postgres;
GRANT ALL ON TABLE public.clinic_scheduling_config TO service_role;

-- Seed demo clinics (parity with Scheduling:Clinics in appsettings.json)
INSERT INTO public.clinic_scheduling_config (clinic_id, provider_kind, external_clinic_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'PawBuckDemo', 'mock-vet-1'),
  ('00000000-0000-0000-0000-000000000002', 'PawBuckDemo', 'mock-vet-2'),
  ('00000000-0000-0000-0000-000000000003', 'PawBuckDemo', 'mock-vet-3'),
  ('00000000-0000-0000-0000-000000000004', 'PawBuckDemo', 'mock-vet-4'),
  ('00000000-0000-0000-0000-000000000005', 'PawBuckDemo', 'mock-vet-5')
ON CONFLICT (clinic_id) DO UPDATE SET
  provider_kind = EXCLUDED.provider_kind,
  external_clinic_id = EXCLUDED.external_clinic_id,
  updated_at = timezone('utc'::text, now());
