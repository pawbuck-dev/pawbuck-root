-- FAQ documents table with pgvector for semantic search (Milo chat)
-- Enable vector extension (Supabase has pgvector available)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Table: store FAQ items with embedding for match_documents RPC
CREATE TABLE IF NOT EXISTS public.faq_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  content text NOT NULL,
  embedding extensions.vector(1536),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for similarity search (cosine distance). lists=1 allows empty table; increase after seeding.
-- Operator class is in extensions schema when vector extension is installed there.
CREATE INDEX IF NOT EXISTS faq_documents_embedding_idx ON public.faq_documents
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 1);

-- RPC: semantic search over faq_documents. Call from Edge Function with query embedding.
-- query_embedding: array of 1536 floats from Gemini (or other) embedding API.
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding double precision[],
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  query_vec extensions.vector(1536);
BEGIN
  -- Cast double precision[] to vector for pgvector (array order preserved)
  query_vec := (SELECT array_agg(x ORDER BY ord)::extensions.vector(1536) FROM unnest(query_embedding) WITH ORDINALITY AS t(x, ord));
  RETURN QUERY
  SELECT
    fd.id,
    fd.question,
    fd.answer,
    fd.content,
    (1 - (fd.embedding <=> query_vec))::float AS similarity
  FROM public.faq_documents fd
  WHERE fd.embedding IS NOT NULL
    AND (1 - (fd.embedding <=> query_vec)) > match_threshold
  ORDER BY fd.embedding <=> query_vec
  LIMIT match_count;
END;
$$;

-- Allow service role to read faq_documents and run match_documents
GRANT SELECT ON public.faq_documents TO service_role;
GRANT EXECUTE ON FUNCTION public.match_documents(double precision[], float, int) TO service_role;

COMMENT ON TABLE public.faq_documents IS 'FAQ entries for Milo chat vector search';
COMMENT ON FUNCTION public.match_documents IS 'Semantic search over faq_documents using query embedding (1536-dim).';
