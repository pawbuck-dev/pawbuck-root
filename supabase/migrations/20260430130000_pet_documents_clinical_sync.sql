-- Document vault → clinical row sync (PawBuck.API DocumentSyncWorker) + proactive push dedupe.

ALTER TABLE public.pet_documents
  ADD COLUMN IF NOT EXISTS clinical_synced_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS clinical_sync_error text NULL;

COMMENT ON COLUMN public.pet_documents.clinical_synced_at IS 'Set when vault row has been processed into vaccinations/medicines (or skipped as duplicate/invalid).';
COMMENT ON COLUMN public.pet_documents.clinical_sync_error IS 'Optional short error when sync could not insert (parse failure, etc.).';

CREATE INDEX IF NOT EXISTS pet_documents_pending_clinical_sync_idx
  ON public.pet_documents (created_at ASC)
  WHERE clinical_synced_at IS NULL
    AND document_type = ANY (ARRAY['vaccinations'::public.pet_document_type, 'medications'::public.pet_document_type]);

CREATE TABLE IF NOT EXISTS public.proactive_pet_health_sends (
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  sent_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (pet_id, sent_on)
);

COMMENT ON TABLE public.proactive_pet_health_sends IS 'At most one proactive senior mobility tip per pet per calendar day (UTC).';

CREATE INDEX IF NOT EXISTS proactive_pet_health_sends_sent_on_idx
  ON public.proactive_pet_health_sends (sent_on DESC);

ALTER TABLE public.proactive_pet_health_sends ENABLE ROW LEVEL SECURITY;

-- Backend (service_role / direct postgres) only; no end-user policies.
REVOKE ALL ON TABLE public.proactive_pet_health_sends FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON TABLE public.proactive_pet_health_sends TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.proactive_pet_health_sends TO postgres;
