-- one_time_ops_log: service/migration-only idempotency ledger (no client access).
ALTER TABLE public.one_time_ops_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.one_time_ops_log IS
  'Idempotency log for one-shot data migrations; not used by app runtime. RLS enabled with no policies (service_role only).';
