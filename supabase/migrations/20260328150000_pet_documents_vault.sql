-- Unified Milo document vault: OCR/classification metadata + extracted JSON per pet.
-- RLS: owner CRUD; household can SELECT (user_can_access_pet); marketplace providers can SELECT for active bookings.

CREATE TYPE public.pet_document_type AS ENUM (
  'medications',
  'lab_results',
  'clinical_exams',
  'vaccinations',
  'billing_invoice',
  'travel_certificate',
  'insurance_policy',
  'pedigree',
  'identity_document',
  'irrelevant'
);

COMMENT ON TYPE public.pet_document_type IS 'Aligned with @pawbuck/milo pet document taxonomy.';

CREATE TABLE IF NOT EXISTS public.pet_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  document_type public.pet_document_type NOT NULL,
  confidence numeric(5, 2) NOT NULL DEFAULT 0,
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS pet_documents_pet_id_idx ON public.pet_documents (pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pet_documents_user_id_idx ON public.pet_documents (user_id);

COMMENT ON TABLE public.pet_documents IS 'Pet document vault: storage path + Milo extraction payload.';
COMMENT ON COLUMN public.pet_documents.user_id IS 'Denormalized pet owner (pets.user_id) for RLS.';
COMMENT ON COLUMN public.pet_documents.extracted_json IS 'Flexible extraction (title, keyFacts, etc.) from Milo vision pipeline.';

ALTER TABLE public.pet_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: owner + household members (same as clinical_exams)
CREATE POLICY "pet_documents_select_accessible"
  ON public.pet_documents FOR SELECT TO authenticated
  USING (public.user_can_access_pet(pet_id));

-- Providers: read documents for pets they have an active marketplace booking with
CREATE POLICY "pet_documents_select_provider_active_booking"
  ON public.pet_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.marketplace_service_bookings b
      JOIN public.provider_profiles pp ON pp.id = b.provider_profile_id
      WHERE b.pet_id = pet_documents.pet_id
        AND pp.user_id = (SELECT auth.uid())
        AND b.status IN ('confirmed', 'in_progress', 'accepted')
    )
  );

-- INSERT: pet owner only (must match pets.user_id)
CREATE POLICY "pet_documents_insert_owner"
  ON public.pet_documents FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = pet_id AND p.user_id = auth.uid() AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "pet_documents_update_own"
  ON public.pet_documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pet_documents_delete_own"
  ON public.pet_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

GRANT ALL ON public.pet_documents TO authenticated;
GRANT ALL ON public.pet_documents TO service_role;
