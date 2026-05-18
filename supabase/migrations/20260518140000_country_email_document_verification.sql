-- Per-country rules for inbound email attachment pet verification (admin-editable via PawBuck.API).

CREATE TABLE IF NOT EXISTS public.country_email_document_verification (
  country text PRIMARY KEY,
  allow_name_only_document_types text[] NOT NULL
    DEFAULT ARRAY['clinical_exams', 'medications']::text[],
  breed_required_document_types text[] NOT NULL
    DEFAULT ARRAY['vaccinations', 'lab_results', 'travel_certificate', 'billing_invoice']::text[],
  fuzzy_match_threshold numeric(4, 2) NOT NULL DEFAULT 0.70,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.country_email_document_verification IS
  'Admin-controlled pet verification rules for email health-document ingestion, keyed by pets.country display name.';
COMMENT ON COLUMN public.country_email_document_verification.allow_name_only_document_types IS
  'Document types that may pass verification when pet name matches but breed is absent on the PDF (e.g. post-op sheets).';
COMMENT ON COLUMN public.country_email_document_verification.breed_required_document_types IS
  'Document types that always require breed on the document when breed verification applies.';

ALTER TABLE public.country_email_document_verification ENABLE ROW LEVEL SECURITY;

-- Mobile does not need this; Edge uses service_role. No authenticated SELECT required for v1.
CREATE POLICY "country_email_doc_verification_service_role_all"
  ON public.country_email_document_verification
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.country_email_document_verification TO service_role;

INSERT INTO public.country_email_document_verification (country, notes)
VALUES
  ('United States', 'Default US rules'),
  ('Canada', 'Default Canada rules'),
  ('United Kingdom', 'Default UK rules'),
  ('Germany', 'Default Germany rules'),
  ('India', 'Default India rules'),
  ('Australia', 'Default Australia rules'),
  ('Ireland', 'Default Ireland rules'),
  ('New Zealand', 'Default New Zealand rules'),
  ('Other', 'Fallback for pets with country Other')
ON CONFLICT (country) DO NOTHING;
