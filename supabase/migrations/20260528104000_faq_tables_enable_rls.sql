-- FAQ tables are maintained via Edge (service_role) and SECURITY DEFINER RPC; lock down PostgREST.
ALTER TABLE public.faq_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_source ENABLE ROW LEVEL SECURITY;
