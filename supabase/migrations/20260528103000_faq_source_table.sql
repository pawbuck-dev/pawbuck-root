-- Source of truth for FAQs: edit here (Dashboard, SQL, or API). No embeddings — scales to 1000+.
CREATE TABLE IF NOT EXISTS public.faq_source (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Link vector table to source so sync can upsert by source id
ALTER TABLE public.faq_documents
  ADD COLUMN IF NOT EXISTS faq_source_id uuid REFERENCES public.faq_source(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS faq_documents_faq_source_id_key
  ON public.faq_documents (faq_source_id) WHERE faq_source_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_source TO service_role;

COMMENT ON TABLE public.faq_source IS 'Canonical FAQ list; sync to faq_documents for vector search.';
