-- Allow service role to insert/update/delete faq_documents for seeding and maintenance
GRANT INSERT, UPDATE, DELETE ON public.faq_documents TO service_role;
