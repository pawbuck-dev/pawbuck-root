-- Allow service role to maintain documentation RAG rows (seed script from consumer-app).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation TO service_role;
