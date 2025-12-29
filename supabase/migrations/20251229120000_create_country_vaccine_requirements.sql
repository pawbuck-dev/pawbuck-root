-- Create country_vaccine_requirements table
-- This table stores vaccine requirements by country and animal type (dog/cat)

CREATE TABLE IF NOT EXISTS country_vaccine_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(100) NOT NULL,
    animal_type VARCHAR(20) NOT NULL,
    vaccine_name VARCHAR(100) NOT NULL,
    canonical_key VARCHAR(50) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    frequency_months INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate vaccine entries
ALTER TABLE country_vaccine_requirements 
ADD CONSTRAINT unique_country_animal_vaccine 
UNIQUE (country, animal_type, vaccine_name);

-- Create index for efficient lookups by country and animal type
CREATE INDEX IF NOT EXISTS idx_country_vaccine_requirements_country_animal 
ON country_vaccine_requirements(country, animal_type);

-- Create index for canonical_key lookups (for matching vaccines across countries)
CREATE INDEX IF NOT EXISTS idx_country_vaccine_requirements_canonical 
ON country_vaccine_requirements(canonical_key);

-- Enable RLS
ALTER TABLE country_vaccine_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read vaccine requirements (reference data)
CREATE POLICY "Allow authenticated users to read vaccine requirements"
    ON country_vaccine_requirements
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policy: Allow anon users to read vaccine requirements (for public access)
CREATE POLICY "Allow anon users to read vaccine requirements"
    ON country_vaccine_requirements
    FOR SELECT
    TO anon
    USING (true);

-- Grant SELECT permissions to roles
GRANT SELECT ON TABLE country_vaccine_requirements TO anon;
GRANT SELECT ON TABLE country_vaccine_requirements TO authenticated;
GRANT ALL ON TABLE country_vaccine_requirements TO postgres;
GRANT ALL ON TABLE country_vaccine_requirements TO service_role;

-- =====================================================
-- SEED DATA: Vaccine requirements by country and animal
-- =====================================================

-- Canada Dogs
INSERT INTO country_vaccine_requirements (country, animal_type, vaccine_name, canonical_key, is_required, frequency_months, description)
VALUES
  ('Canada', 'dog', 'Rabies', 'RABIES', true, 36, 'Legally required in most provinces. Essential for border crossing.'),
  ('Canada', 'dog', 'DA2PP (Distemper Combo)', 'DAPP_CORE', true, 36, 'Core: Distemper, Adenovirus-2, Parainfluenza, Parvovirus.'),
  ('Canada', 'dog', 'Leptospirosis', 'LEPTO', false, 12, 'Recommended due to high wildlife exposure in urban and rural areas.'),
  ('Canada', 'dog', 'Bordetella', 'BORDETELLA', false, 12, 'Recommended for social dogs (daycare, boarding, parks).'),
  ('Canada', 'dog', 'Lyme Disease', 'LYME', false, 12, 'Highly recommended in tick-endemic regions (ON, QC, MB, Maritimes).');

-- Canada Cats
INSERT INTO country_vaccine_requirements (country, animal_type, vaccine_name, canonical_key, is_required, frequency_months, description)
VALUES
  ('Canada', 'cat', 'Rabies', 'RABIES', true, 36, 'Legally required. Protects against fatal virus transmission.'),
  ('Canada', 'cat', 'FVRCP', 'FVRCP_CORE', true, 36, 'Core: Rhinotracheitis, Calicivirus, Panleukopenia.'),
  ('Canada', 'cat', 'FeLV (Leukemia)', 'FELV', false, 12, 'Recommended for outdoor cats or multi-cat households.');

-- USA Dogs
INSERT INTO country_vaccine_requirements (country, animal_type, vaccine_name, canonical_key, is_required, frequency_months, description)
VALUES
  ('United States', 'dog', 'Rabies', 'RABIES', true, 36, 'Legally mandated in nearly all states. 1-yr and 3-yr intervals common.'),
  ('United States', 'dog', 'DAPP / DHPP', 'DAPP_CORE', true, 36, 'Core: Distemper, Adenovirus, Parvovirus, Parainfluenza.'),
  ('United States', 'dog', 'Leptospirosis', 'LEPTO', false, 12, 'Recommended lifestyle vaccine for urban/rural dogs.'),
  ('United States', 'dog', 'Bordetella', 'BORDETELLA', false, 12, 'Required by most grooming and boarding facilities.'),
  ('United States', 'dog', 'Lyme', 'LYME', false, 12, 'Essential in Northeast, Mid-Atlantic, and Upper Midwest.');

-- USA Cats
INSERT INTO country_vaccine_requirements (country, animal_type, vaccine_name, canonical_key, is_required, frequency_months, description)
VALUES
  ('United States', 'cat', 'Rabies', 'RABIES', true, 12, 'Mandatory in most states. Frequency varies by state law/product.'),
  ('United States', 'cat', 'FVRCP', 'FVRCP_CORE', true, 36, 'Core: Feline Viral Rhinotracheitis, Calicivirus, and Panleukopenia.'),
  ('United States', 'cat', 'FeLV (Leukemia)', 'FELV', false, 12, 'Recommended for outdoor cats and kittens.');

-- UK Dogs
INSERT INTO country_vaccine_requirements (country, animal_type, vaccine_name, canonical_key, is_required, frequency_months, description)
VALUES
  ('United Kingdom', 'dog', 'DHP', 'DAPP_CORE', true, 36, 'Core: Distemper, Hepatitis, Parvovirus.'),
  ('United Kingdom', 'dog', 'Leptospirosis (L4)', 'LEPTO', true, 12, 'Considered core in UK due to high environmental prevalence.'),
  ('United Kingdom', 'dog', 'Pi (Parainfluenza)', 'BORDETELLA', true, 12, 'Often bundled with DHP but requires annual booster.'),
  ('United Kingdom', 'dog', 'Lyme Disease', 'LYME', false, 12, 'Recommended for dogs in high-tick areas (Highlands, New Forest).'),
  ('United Kingdom', 'dog', 'Rabies', 'RABIES', false, 36, 'Non-core. Only required for international travel (Pet Passport).');

-- UK Cats
INSERT INTO country_vaccine_requirements (country, animal_type, vaccine_name, canonical_key, is_required, frequency_months, description)
VALUES
  ('United Kingdom', 'cat', 'Cat Flu', 'FVRCP_CORE', true, 12, 'Core: Feline Herpesvirus and Calicivirus.'),
  ('United Kingdom', 'cat', 'Feline Enteritis', 'FVRCP_CORE', true, 36, 'Core: Feline Parvovirus protection.'),
  ('United Kingdom', 'cat', 'FeLV (Leukemia)', 'FELV', false, 12, 'Strongly recommended for any cat with outdoor access.');
