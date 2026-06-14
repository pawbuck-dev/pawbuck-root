-- Synthetic ops probe history for admin availability metrics (PawBuck.API worker + external ingest).

CREATE TABLE IF NOT EXISTS public.ops_probe_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_name text NOT NULL,
  source text NOT NULL DEFAULT 'internal'
    CHECK (source = ANY (ARRAY['internal'::text, 'external_github'::text, 'external'::text])),
  ok boolean NOT NULL,
  latency_ms int,
  error_summary text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS ops_probe_results_name_created_idx
  ON public.ops_probe_results (probe_name, created_at DESC);

CREATE INDEX IF NOT EXISTS ops_probe_results_created_idx
  ON public.ops_probe_results (created_at DESC);

COMMENT ON TABLE public.ops_probe_results IS
  'Time-series results from internal PawBuck.API ops probes and external synthetics (GitHub Actions).';

ALTER TABLE public.ops_probe_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_probe_results_service_role_all"
  ON public.ops_probe_results FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.ops_probe_results TO service_role;
