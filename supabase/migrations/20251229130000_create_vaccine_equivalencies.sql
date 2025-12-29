-- Create vaccine_equivalencies table
-- This table maps vaccine name variants/synonyms to their canonical names
-- for flexible matching of vaccine records

CREATE TABLE IF NOT EXISTS public.vaccine_equivalencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(canonical_name, variant_name)
);

-- Create index for efficient lookups by variant_name (most common use case)
CREATE INDEX IF NOT EXISTS idx_vaccine_equivalencies_variant 
ON vaccine_equivalencies(variant_name);

-- Create index for lookups by canonical_name
CREATE INDEX IF NOT EXISTS idx_vaccine_equivalencies_canonical 
ON vaccine_equivalencies(canonical_name);

-- Enable RLS
ALTER TABLE vaccine_equivalencies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read vaccine equivalencies (reference data)
CREATE POLICY "Allow authenticated users to read vaccine equivalencies"
    ON vaccine_equivalencies
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policy: Allow anon users to read vaccine equivalencies (for public access)
CREATE POLICY "Allow anon users to read vaccine equivalencies"
    ON vaccine_equivalencies
    FOR SELECT
    TO anon
    USING (true);

-- Grant SELECT permissions to roles
GRANT SELECT ON TABLE vaccine_equivalencies TO anon;
GRANT SELECT ON TABLE vaccine_equivalencies TO authenticated;
GRANT ALL ON TABLE vaccine_equivalencies TO postgres;
GRANT ALL ON TABLE vaccine_equivalencies TO service_role;

-- =====================================================
-- SEED DATA: Vaccine name variants mapped to canonical names
-- =====================================================

INSERT INTO vaccine_equivalencies (canonical_name, variant_name, notes) VALUES
-- DAPP Core (Dogs) - Distemper combo vaccines
('DAPP_CORE', 'DA2PP', 'Common US naming: Distemper, Adenovirus-2, Parainfluenza, Parvovirus'),
('DAPP_CORE', 'DHPP', 'Alternative naming: Distemper, Hepatitis, Parainfluenza, Parvovirus'),
('DAPP_CORE', 'DHP', 'UK naming: Distemper, Hepatitis, Parvovirus'),
('DAPP_CORE', 'DHPPi', 'Extended combo including Parainfluenza'),
('DAPP_CORE', 'Distemper', 'Generic distemper reference'),

-- Leptospirosis
('LEPTO', 'L4', 'UK 4-strain Leptospirosis vaccine'),
('LEPTO', 'L2', 'Older 2-strain Leptospirosis vaccine'),
('LEPTO', 'Leptospira', 'Generic Leptospirosis reference'),
('LEPTO', 'Canigen L4', 'Brand name: Virbac Canigen L4'),

-- Rabies
('RABIES', 'RV', 'Abbreviated rabies reference'),
('RABIES', 'Rabvac', 'Brand name rabies vaccine'),
('RABIES', 'Rabies 3yr', '3-year rabies vaccine formulation'),

-- Feline Core (Cats) - FVRCP combo vaccines
('FVRCP_CORE', 'Cat Flu', 'UK common name for feline respiratory vaccines'),
('FVRCP_CORE', 'RCP', 'Abbreviated: Rhinotracheitis, Calicivirus, Panleukopenia'),
('FVRCP_CORE', 'Feline Distemper', 'Common name for Panleukopenia'),
('FVRCP_CORE', 'Panleukopenia', 'Feline Parvovirus / Feline Distemper'),

-- Lyme Disease
('LYME', 'Borrelia', 'Borrelia burgdorferi - causative agent'),
('LYME', 'Lyme Vax', 'Generic Lyme vaccine reference');

