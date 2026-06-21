-- Fix Supabase linter rls_disabled_in_public: lock down tables that are maintained
-- via service_role / SECURITY DEFINER RPCs only (not PostgREST client access).

-- ---------------------------------------------------------------------------
-- documentation (Milo RAG corpus) — never exposed via anon/authenticated PostgREST
-- ---------------------------------------------------------------------------
ALTER TABLE public.documentation ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.documentation FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation TO service_role;

COMMENT ON TABLE public.documentation IS
  'FAQ/knowledge chunks for API RAG (match_documentation). RLS enabled; no client policies — service_role + SECURITY DEFINER RPC only.';

-- ---------------------------------------------------------------------------
-- founding member cap tables — webhook / SECURITY DEFINER only
-- ---------------------------------------------------------------------------
ALTER TABLE public.founding_member_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founding_member_purchases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.founding_member_counter FROM anon, authenticated;
REVOKE ALL ON public.founding_member_purchases FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founding_member_counter TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founding_member_purchases TO service_role;

-- ---------------------------------------------------------------------------
-- Safety net: any other public table created without RLS (dev/staging drift)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND c.relname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Enabled RLS on public.%', r.tablename;
  END LOOP;
END $$;
