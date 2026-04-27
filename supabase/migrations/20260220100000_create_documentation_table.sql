-- RAG FAQ: documentation table and vector search for Paw Buck ecosystem
-- Requires pgvector extension (Supabase includes it)

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Documentation table for FAQ / knowledge base chunks
CREATE TABLE IF NOT EXISTS public.documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding extensions.vector(768) NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.documentation IS 'FAQ and knowledge base chunks for RAG; embedding from Gemini gemini-embedding-2 at 768 dims (Generative Language API)';
COMMENT ON COLUMN public.documentation.content IS 'Chunk text used for retrieval and context';
COMMENT ON COLUMN public.documentation.metadata IS 'Optional metadata (source, title, category, etc.)';
COMMENT ON COLUMN public.documentation.embedding IS 'Vector embedding for cosine similarity search';

-- Index for fast cosine similarity search (IVFFlat; adjust lists as data grows)
CREATE INDEX IF NOT EXISTS documentation_embedding_idx ON public.documentation
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- Cosine similarity search: returns top match_count rows ordered by similarity (1 - distance)
CREATE OR REPLACE FUNCTION public.match_documentation(
  query_embedding extensions.vector(768),
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.0
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding)::float AS similarity
  FROM public.documentation d
  WHERE 1 - (d.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_documentation(extensions.vector(768), int, float) IS 'Cosine similarity search over documentation.embedding for RAG context retrieval.';
