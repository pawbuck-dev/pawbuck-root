-- Extend pending-clinical-sync partial index to exams + labs (unified Milo vision pipeline).

DROP INDEX IF EXISTS public.pet_documents_pending_clinical_sync_idx;

CREATE INDEX pet_documents_pending_clinical_sync_idx
  ON public.pet_documents (created_at ASC)
  WHERE clinical_synced_at IS NULL
    AND document_type = ANY (
      ARRAY[
        'vaccinations'::public.pet_document_type,
        'medications'::public.pet_document_type,
        'clinical_exams'::public.pet_document_type,
        'lab_results'::public.pet_document_type
      ]
    );
