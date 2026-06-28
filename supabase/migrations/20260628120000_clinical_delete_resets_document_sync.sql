-- When owners delete structured clinical rows, allow vault documents to re-sync.
-- Mitigation: additive triggers + backfill only clears sync flags (no row deletes).

CREATE OR REPLACE FUNCTION public.reset_pet_document_sync_if_clinical_rows_gone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pet_id uuid := OLD.pet_id;
  v_document_url text := OLD.document_url;
BEGIN
  IF v_document_url IS NULL OR btrim(v_document_url) = '' THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vaccinations v
    WHERE v.pet_id = v_pet_id AND v.document_url = v_document_url
    UNION ALL
    SELECT 1 FROM public.medicines m
    WHERE m.pet_id = v_pet_id AND m.document_url = v_document_url
    UNION ALL
    SELECT 1 FROM public.clinical_exams ce
    WHERE ce.pet_id = v_pet_id AND ce.document_url = v_document_url
    UNION ALL
    SELECT 1 FROM public.lab_results lr
    WHERE lr.pet_id = v_pet_id AND lr.document_url = v_document_url
  ) THEN
    RETURN OLD;
  END IF;

  UPDATE public.pet_documents pd
  SET clinical_synced_at = NULL,
      clinical_sync_error = NULL,
      updated_at = timezone('utc', now())
  WHERE pd.pet_id = v_pet_id
    AND pd.storage_path = v_document_url;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.reset_pet_document_sync_if_clinical_rows_gone() IS
  'After clinical row delete: if no rows remain for document_url, clear pet_documents clinical sync so DocumentSyncWorker can re-insert.';

DROP TRIGGER IF EXISTS trg_vaccinations_reset_pet_document_sync ON public.vaccinations;
CREATE TRIGGER trg_vaccinations_reset_pet_document_sync
  AFTER DELETE ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_pet_document_sync_if_clinical_rows_gone();

DROP TRIGGER IF EXISTS trg_medicines_reset_pet_document_sync ON public.medicines;
CREATE TRIGGER trg_medicines_reset_pet_document_sync
  AFTER DELETE ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_pet_document_sync_if_clinical_rows_gone();

DROP TRIGGER IF EXISTS trg_clinical_exams_reset_pet_document_sync ON public.clinical_exams;
CREATE TRIGGER trg_clinical_exams_reset_pet_document_sync
  AFTER DELETE ON public.clinical_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_pet_document_sync_if_clinical_rows_gone();

DROP TRIGGER IF EXISTS trg_lab_results_reset_pet_document_sync ON public.lab_results;
CREATE TRIGGER trg_lab_results_reset_pet_document_sync
  AFTER DELETE ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_pet_document_sync_if_clinical_rows_gone();

-- Heal existing drift: vault marked synced but structured rows were deleted manually.
UPDATE public.pet_documents pd
SET clinical_synced_at = NULL,
    clinical_sync_error = NULL,
    updated_at = timezone('utc', now())
WHERE pd.clinical_synced_at IS NOT NULL
  AND pd.document_type IN (
    'vaccinations'::public.pet_document_type,
    'medications'::public.pet_document_type,
    'clinical_exams'::public.pet_document_type,
    'lab_results'::public.pet_document_type
  )
  AND (
    (
      pd.document_type = 'vaccinations'::public.pet_document_type
      AND NOT EXISTS (
        SELECT 1 FROM public.vaccinations v
        WHERE v.pet_id = pd.pet_id AND v.document_url = pd.storage_path
      )
    )
    OR (
      pd.document_type = 'medications'::public.pet_document_type
      AND NOT EXISTS (
        SELECT 1 FROM public.medicines m
        WHERE m.pet_id = pd.pet_id AND m.document_url = pd.storage_path
      )
    )
    OR (
      pd.document_type = 'clinical_exams'::public.pet_document_type
      AND NOT EXISTS (
        SELECT 1 FROM public.clinical_exams ce
        WHERE ce.pet_id = pd.pet_id AND ce.document_url = pd.storage_path
      )
    )
    OR (
      pd.document_type = 'lab_results'::public.pet_document_type
      AND NOT EXISTS (
        SELECT 1 FROM public.lab_results lr
        WHERE lr.pet_id = pd.pet_id AND lr.document_url = pd.storage_path
      )
    )
  );
