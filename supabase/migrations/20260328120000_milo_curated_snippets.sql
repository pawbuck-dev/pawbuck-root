-- Curated educational snippets for Milo (breed/species grounding). Not a substitute for veterinary advice.
-- Read by Edge milo-chat tool and PawBuck.API GET /api/milo/curated-guidance.

CREATE TABLE IF NOT EXISTS public.milo_curated_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  breed_key text,
  animal_type text,
  content text NOT NULL,
  source_attribution text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.milo_curated_snippets IS 'Editorial pet-care snippets for Milo grounding; cite only facts from tool output.';
COMMENT ON COLUMN public.milo_curated_snippets.topic IS 'e.g. weight_range, general_wellness';
COMMENT ON COLUMN public.milo_curated_snippets.breed_key IS 'Normalized key e.g. shih_tzu; NULL = species-wide row';
COMMENT ON COLUMN public.milo_curated_snippets.animal_type IS 'Dog, Cat, or NULL for any';
COMMENT ON COLUMN public.milo_curated_snippets.source_attribution IS 'Short citation / disclaimer line';

CREATE INDEX IF NOT EXISTS milo_curated_snippets_lookup_idx
  ON public.milo_curated_snippets (topic, lower(breed_key), animal_type);

ALTER TABLE public.milo_curated_snippets ENABLE ROW LEVEL SECURITY;

-- No public policies: Edge/API use service role or DB connection; avoids accidental client exposure via PostgREST if RLS blocks anon.

GRANT SELECT ON public.milo_curated_snippets TO service_role;

-- Seed rows (idempotent): general education only; vet confirmation required for health decisions.
INSERT INTO public.milo_curated_snippets (topic, breed_key, animal_type, content, source_attribution)
SELECT v.topic, v.breed_key, v.animal_type, v.content, v.source_attribution
FROM (
  VALUES
    (
      'weight_range',
      NULL::text,
      'Dog'::text,
      'Healthy weight depends on breed, sex, age, and muscle mass—not the scale alone. Pair weight with Body Condition Score (ribs palpable without excess fat, visible waist from above). Discuss target weight and diet changes with your veterinarian.',
      'General canine nutrition reference; not veterinary advice.'
    ),
    (
      'weight_range',
      NULL::text,
      'Cat'::text,
      'Indoor cats vary widely by frame. Trend matters: sudden loss or gain warrants a vet visit. Use body condition (ribs, waist, abdominal tuck) alongside weight. Your veterinarian can set a safe goal.',
      'General feline wellness reference; not veterinary advice.'
    ),
    (
      'weight_range',
      'shih_tzu'::text,
      'Dog'::text,
      'Published breed guides often cite adult Shih Tzu around ~9–16 lb (about 4–7 kg); individuals and lines vary. Puppies follow growth curves, not adult ranges. Use this only as general context and confirm with your veterinarian.',
      'Typical breed guide summary; not a diagnosis.'
    ),
    (
      'weight_range',
      'golden_retriever'::text,
      'Dog'::text,
      'Adult Golden Retrievers are a large breed; healthy adult weight spans a wide range by sex and structure. Growth in the first ~12–18 months should be guided by your veterinarian to avoid orthopedic issues.',
      'General large-breed guidance; not veterinary advice.'
    ),
    (
      'weight_range',
      'pug'::text,
      'Dog'::text,
      'Pugs are brachycephalic and prone to obesity-related breathing issues; maintaining lean condition often matters more than a single “ideal” number. Your veterinarian can assess body condition and calories.',
      'Breed-associated wellness note; not veterinary advice.'
    ),
    (
      'general_wellness',
      NULL::text,
      NULL::text,
      'Routine wellness includes appropriate nutrition, fresh water, exercise suited to age and breed, parasite prevention, and annual (or as-advised) veterinary exams. Bring questions about behavior, diet, or symptoms to your clinic.',
      'General pet care summary; not veterinary advice.'
    )
) AS v(topic, breed_key, animal_type, content, source_attribution)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.milo_curated_snippets s
  WHERE s.topic = v.topic
    AND s.breed_key IS NOT DISTINCT FROM v.breed_key
    AND s.animal_type IS NOT DISTINCT FROM v.animal_type
);
