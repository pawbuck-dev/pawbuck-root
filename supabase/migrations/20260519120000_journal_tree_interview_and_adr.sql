-- Journal tree interview sessions + medication ADR tables (AI journal notetaking v1.5).

-- ---------------------------------------------------------------------------
-- journal_interview_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  tree_id text NOT NULL,
  tree_version text NOT NULL,
  phase text NOT NULL DEFAULT 'context_surface'
    CHECK (phase = ANY (ARRAY[
      'context_surface'::text,
      'question'::text,
      'summary_draft'::text,
      'complete'::text,
      'abandoned'::text
    ])),
  current_question_id text,
  questions_asked_count int NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_summary jsonb,
  emergency_detected boolean NOT NULL DEFAULT false,
  confidence_score numeric(4, 2),
  journal_entry_id uuid REFERENCES public.pet_journal_entries (id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS journal_interview_sessions_user_pet_idx
  ON public.journal_interview_sessions (user_id, pet_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS journal_interview_sessions_expires_idx
  ON public.journal_interview_sessions (expires_at)
  WHERE phase <> 'complete'::text;

COMMENT ON TABLE public.journal_interview_sessions IS
  'Server-side state for tree-driven Milo journal symptom interviews.';

CREATE TRIGGER handle_journal_interview_sessions_updated_at
  BEFORE UPDATE ON public.journal_interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.journal_interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_interview_sessions_select_accessible"
  ON public.journal_interview_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "journal_interview_sessions_insert_own"
  ON public.journal_interview_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "journal_interview_sessions_update_own"
  ON public.journal_interview_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.user_can_access_pet(pet_id))
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_pet(pet_id));

CREATE POLICY "journal_interview_sessions_service_role_all"
  ON public.journal_interview_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.journal_interview_sessions TO authenticated;
GRANT ALL ON TABLE public.journal_interview_sessions TO service_role;

-- Structured AI journal metadata on saved entries
ALTER TABLE public.pet_journal_entries
  ADD COLUMN IF NOT EXISTS interview_metadata jsonb;

COMMENT ON COLUMN public.pet_journal_entries.interview_metadata IS
  'Optional: tree_id, structured_fields, ai_confidence, source when saved from tree interview.';

-- ---------------------------------------------------------------------------
-- Medication ADR reference data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_name text NOT NULL,
  brand_names text[] NOT NULL DEFAULT '{}'::text[],
  species text[] NOT NULL DEFAULT ARRAY['dog', 'cat']::text[],
  route text,
  source text NOT NULL DEFAULT 'seed',
  source_version text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS medication_products_generic_name_lower_idx
  ON public.medication_products (lower(generic_name));

CREATE TABLE IF NOT EXISTS public.medication_adr_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.medication_products (id) ON DELETE CASCADE,
  symptom_taxonomy text[] NOT NULL,
  severity text NOT NULL DEFAULT 'soft'
    CHECK (severity = ANY (ARRAY['soft'::text, 'prominent'::text])),
  label_text text NOT NULL,
  confidence numeric(4, 2) NOT NULL DEFAULT 0.90,
  source text NOT NULL DEFAULT 'seed',
  source_version text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS medication_adr_entries_product_idx
  ON public.medication_adr_entries (product_id);

CREATE INDEX IF NOT EXISTS medication_adr_entries_symptom_gin_idx
  ON public.medication_adr_entries USING gin (symptom_taxonomy);

CREATE TABLE IF NOT EXISTS public.medication_adr_ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_version text,
  status text NOT NULL,
  products_upserted int NOT NULL DEFAULT 0,
  entries_upserted int NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.medication_adr_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.medication_products (id) ON DELETE CASCADE,
  generic_name text,
  symptom_taxonomy text[] NOT NULL,
  severity text NOT NULL DEFAULT 'soft',
  label_text text NOT NULL,
  confidence numeric(4, 2) NOT NULL DEFAULT 0.95,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.medication_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_adr_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_adr_ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_adr_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medication_adr_read_authenticated"
  ON public.medication_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "medication_adr_entries_read_authenticated"
  ON public.medication_adr_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "medication_adr_service_role_all_products"
  ON public.medication_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "medication_adr_service_role_all_entries"
  ON public.medication_adr_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "medication_adr_service_role_all_runs"
  ON public.medication_adr_ingestion_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "medication_adr_service_role_all_overrides"
  ON public.medication_adr_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON public.medication_products TO authenticated;
GRANT SELECT ON public.medication_adr_entries TO authenticated;
GRANT ALL ON public.medication_products TO service_role;
GRANT ALL ON public.medication_adr_entries TO service_role;
GRANT ALL ON public.medication_adr_ingestion_runs TO service_role;
GRANT ALL ON public.medication_adr_overrides TO service_role;

-- Seed common veterinary products + ADR links (v1.5 bootstrap before DailyMed ingest)
INSERT INTO public.medication_products (generic_name, brand_names, source, source_version)
VALUES
  ('carprofen', ARRAY['Rimadyl', 'Novox', 'Carprofen'], 'seed', 'v1.5'),
  ('meloxicam', ARRAY['Metacam', 'Meloxicam'], 'seed', 'v1.5'),
  ('oclacitinib', ARRAY['Apoquel'], 'seed', 'v1.5'),
  ('prednisone', ARRAY['Prednisone'], 'seed', 'v1.5'),
  ('prednisolone', ARRAY['Prednisolone'], 'seed', 'v1.5'),
  ('gabapentin', ARRAY['Gabapentin', 'Neurontin'], 'seed', 'v1.5'),
  ('enalapril', ARRAY['Enalapril'], 'seed', 'v1.5'),
  ('benazepril', ARRAY['Benazepril'], 'seed', 'v1.5'),
  ('fluoxetine', ARRAY['Prozac', 'Reconcile'], 'seed', 'v1.5'),
  ('amoxicillin', ARRAY['Amoxi', 'Clavamox'], 'seed', 'v1.5'),
  ('metronidazole', ARRAY['Flagyl', 'Metronidazole'], 'seed', 'v1.5')
ON CONFLICT DO NOTHING;

INSERT INTO public.medication_adr_entries (product_id, symptom_taxonomy, severity, label_text, confidence, source, source_version)
SELECT p.id, ARRAY['vomiting', 'gi', 'diarrhea']::text[], 'prominent',
  'Anti-inflammatories such as carprofen can cause GI upset and, rarely, bleeding.',
  0.92, 'seed', 'v1.5'
FROM public.medication_products p WHERE lower(p.generic_name) = 'carprofen'
ON CONFLICT DO NOTHING;

INSERT INTO public.medication_adr_entries (product_id, symptom_taxonomy, severity, label_text, confidence, source, source_version)
SELECT p.id, ARRAY['vomiting', 'gi']::text[], 'soft',
  'Vomiting is a documented side effect of Apoquel (oclacitinib).',
  0.90, 'seed', 'v1.5'
FROM public.medication_products p WHERE lower(p.generic_name) = 'oclacitinib'
ON CONFLICT DO NOTHING;

INSERT INTO public.medication_adr_entries (product_id, symptom_taxonomy, severity, label_text, confidence, source, source_version)
SELECT p.id, ARRAY['vomiting', 'gi', 'diarrhea']::text[], 'soft',
  'GI upset is common shortly after starting antibiotics.',
  0.88, 'seed', 'v1.5'
FROM public.medication_products p WHERE lower(p.generic_name) IN ('amoxicillin', 'metronidazole')
ON CONFLICT DO NOTHING;

INSERT INTO public.medication_adr_entries (product_id, symptom_taxonomy, severity, label_text, confidence, source, source_version)
SELECT p.id, ARRAY['lethargy', 'sedation']::text[], 'prominent',
  'Gabapentin commonly causes sedation or lethargy.',
  0.91, 'seed', 'v1.5'
FROM public.medication_products p WHERE lower(p.generic_name) = 'gabapentin'
ON CONFLICT DO NOTHING;

INSERT INTO public.medication_adr_entries (product_id, symptom_taxonomy, severity, label_text, confidence, source, source_version)
SELECT p.id, ARRAY['cough', 'respiratory']::text[], 'soft',
  'ACE inhibitors such as enalapril can cause a dry cough in some dogs.',
  0.87, 'seed', 'v1.5'
FROM public.medication_products p WHERE lower(p.generic_name) IN ('enalapril', 'benazepril')
ON CONFLICT DO NOTHING;

INSERT INTO public.medication_adr_entries (product_id, symptom_taxonomy, severity, label_text, confidence, source, source_version)
SELECT p.id, ARRAY['appetite_increase', 'polyuria']::text[], 'soft',
  'Steroids often increase appetite and thirst.',
  0.90, 'seed', 'v1.5'
FROM public.medication_products p WHERE lower(p.generic_name) IN ('prednisone', 'prednisolone')
ON CONFLICT DO NOTHING;

-- Default journal config: tree interview on after v1.5 launch (admin can disable)
INSERT INTO public.milo_journal_config (id, config)
VALUES (
  'default',
  '{"journalTreeInterviewEnabled":true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  config = milo_journal_config.config || '{"journalTreeInterviewEnabled":true}'::jsonb,
  updated_at = timezone('utc'::text, now());
