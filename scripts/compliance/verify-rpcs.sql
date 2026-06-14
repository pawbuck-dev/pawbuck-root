-- Compliance RPC / table verification (run in psql or Supabase SQL editor)

\echo '=== Account erasure RPCs ==='
SELECT proname, proargtypes::regtype[]
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'erase_user_data',
    'schedule_account_deletion',
    'cancel_scheduled_account_deletion'
  )
ORDER BY proname;

\echo '=== Pricing v1.5 tables ==='
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_subscription_usage',
    'subscription_limits',
    'subscription_feature_gates',
    'account_deletion_requests',
    'data_export_requests',
    'retention_job_runs'
  )
ORDER BY table_name;

\echo '=== Document quota helpers ==='
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_user_document_count', 'assert_document_quota', 'enforce_document_quota_for_health_row')
ORDER BY proname;

\echo '=== Sample subscription_limits (free) ==='
SELECT plan, max_pets, max_documents, max_milo_conversations, max_ai_journal_entries
FROM public.subscription_limits
WHERE plan = 'free';
