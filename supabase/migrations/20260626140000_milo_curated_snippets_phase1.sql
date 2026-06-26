-- Phase 1A: expand milo_curated_snippets (weight, vaccine education, parasite, nutrition).
-- General education only; not veterinary advice. Idempotent inserts.

INSERT INTO public.milo_curated_snippets (topic, breed_key, animal_type, content, source_attribution)
SELECT v.topic, v.breed_key, v.animal_type, v.content, v.source_attribution
FROM (
  VALUES
    -- weight_range: additional popular breeds (dog)
    ('weight_range', 'labrador_retriever', 'Dog', 'Adult Labrador Retrievers vary widely by sex and build; healthy adults often fall in a broad band published by breed guides. Puppies need growth monitored by your veterinarian—avoid rapid weight gain in large breeds.', 'Typical breed guide summary; not a diagnosis.'),
    ('weight_range', 'german_shepherd', 'Dog', 'German Shepherds are large, active dogs; healthy weight depends on hip/spine conformation and muscle. Lean condition supports joint health—your veterinarian can assess body condition score and calories.', 'General large-breed guidance; not veterinary advice.'),
    ('weight_range', 'french_bulldog', 'Dog', 'French Bulldogs are brachycephalic and prone to obesity-related breathing strain. Maintaining lean body condition often matters more than hitting a single scale number—confirm targets with your veterinarian.', 'Breed-associated wellness note; not veterinary advice.'),
    ('weight_range', 'beagle', 'Dog', 'Beagles are food-motivated and prone to weight gain; pair scale weight with body condition (waist, rib palpation). Your veterinarian can set a safe calorie target.', 'General breed tendency; not veterinary advice.'),
    ('weight_range', 'border_collie', 'Dog', 'Border Collies are high-energy; weight should reflect muscle and activity level. Sudden loss or gain warrants a vet visit.', 'General working-breed guidance; not veterinary advice.'),
    ('weight_range', 'dachshund', 'Dog', 'Extra weight increases back stress in Dachshunds. Keep lean body condition; discuss ideal weight with your veterinarian.', 'Breed-associated wellness note; not veterinary advice.'),
    ('weight_range', 'chihuahua', 'Dog', 'Tiny breeds have narrow healthy ranges relative to frame. Use body condition alongside weight; puppies need vet-guided growth.', 'General toy-breed guidance; not veterinary advice.'),
    ('weight_range', 'yorkshire_terrier', 'Dog', 'Yorkshire Terriers vary by line; trend matters more than one number. Discuss targets with your veterinarian.', 'Typical breed guide summary; not a diagnosis.'),
    ('weight_range', 'boxer', 'Dog', 'Boxers are muscular medium-large dogs; healthy weight spans a wide range. Your veterinarian can assess condition and activity needs.', 'General breed guidance; not veterinary advice.'),
    ('weight_range', 'australian_shepherd', 'Dog', 'Australian Shepherds are athletic; weight should match workload and muscle. Sudden changes warrant veterinary review.', 'General working-breed guidance; not veterinary advice.'),
    ('weight_range', 'cavalier_king_charles_spaniel', 'Dog', 'Cavaliers can gain weight easily; lean condition supports heart and joint health. Confirm diet and weight goals with your veterinarian.', 'General breed guidance; not veterinary advice.'),
    ('weight_range', 'siberian_husky', 'Dog', 'Huskies often run lean; seasonal appetite changes are common. Pair weight with body condition and vet guidance.', 'General breed guidance; not veterinary advice.'),
    -- weight_range: cats
    ('weight_range', 'domestic_shorthair', 'Cat', 'Domestic shorthairs vary widely; indoor cats often need calorie control. Trend and body condition matter—your veterinarian sets safe goals.', 'General feline wellness reference; not veterinary advice.'),
    ('weight_range', 'siamese', 'Cat', 'Siamese tend toward a lean, angular frame; sudden weight loss or gain should be evaluated by your veterinarian.', 'General breed guidance; not veterinary advice.'),
    ('weight_range', 'maine_coon', 'Cat', 'Maine Coons are large-framed cats that mature slowly; adult weight ranges are wider than average cats. Growth and adult targets should be vet-guided.', 'General breed guidance; not veterinary advice.'),
    ('weight_range', 'persian', 'Cat', 'Persians may be less active indoors; obesity risk is common. Maintain lean condition with your veterinarian''s guidance.', 'General breed guidance; not veterinary advice.'),
    ('weight_range', 'ragdoll', 'Cat', 'Ragdolls are large, relaxed cats; healthy weight depends on frame and activity. Monitor trends with your veterinarian.', 'General breed guidance; not veterinary advice.'),
    -- vaccine_guidance (species education)
    ('vaccine_guidance', NULL::text, 'Dog', 'Core vaccines for dogs typically include protection against distemper, parvovirus, adenovirus, and rabies (where required by law). Non-core vaccines (e.g. Bordetella, Leptospirosis, Lyme) depend on lifestyle, travel, and local disease risk—your veterinarian tailors a plan.', 'AAHA/WSAVA public summary; confirm schedule with your veterinarian.'),
    ('vaccine_guidance', NULL::text, 'Cat', 'Core vaccines for cats commonly include feline viral rhinotracheitis, calicivirus, panleukopenia, and rabies where required. Non-core vaccines (e.g. FeLV) depend on indoor/outdoor lifestyle and regional risk—discuss with your veterinarian.', 'WSAVA public summary; confirm schedule with your veterinarian.'),
    -- parasite_prevention
    ('parasite_prevention', NULL::text, 'Dog', 'Year-round heartworm prevention is recommended in many North American regions because mosquitoes transmit the parasite. Flea and tick control depends on exposure (woods, wildlife, travel). Product choice and testing intervals should come from your veterinarian—not from online dosing charts.', 'General parasite prevention concepts; not product-specific advice.'),
    ('parasite_prevention', NULL::text, 'Cat', 'Indoor cats still benefit from parasite prevention in many regions (heartworm, fleas, ticks on other pets or through screens). Your veterinarian selects products safe for cats—never use dog-only preventives on cats.', 'General parasite prevention concepts; not product-specific advice.'),
    -- nutrition_basics
    ('nutrition_basics', NULL::text, 'Dog', 'Complete and balanced dog foods should meet AAFCO standards for the labeled life stage (growth, adult, or all life stages). Treats should generally stay at or below about 10% of daily calories. Diet changes for medical conditions require veterinary guidance.', 'General canine nutrition reference; not veterinary advice.'),
    ('nutrition_basics', NULL::text, 'Cat', 'Cats require animal-source protein and nutrients like taurine in complete diets meeting AAFCO standards. Obesity and sudden appetite changes warrant veterinary review. Treat calories count toward daily intake.', 'General feline nutrition reference; not veterinary advice.'),
    ('nutrition_basics', NULL::text, NULL::text, 'Puppies and kittens need life-stage-appropriate nutrition; large-breed puppies benefit from controlled growth diets. Always provide fresh water and transition foods gradually over about a week when switching brands.', 'General pet nutrition summary; not veterinary advice.')
) AS v(topic, breed_key, animal_type, content, source_attribution)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.milo_curated_snippets s
  WHERE s.topic = v.topic
    AND s.breed_key IS NOT DISTINCT FROM v.breed_key
    AND s.animal_type IS NOT DISTINCT FROM v.animal_type
);
