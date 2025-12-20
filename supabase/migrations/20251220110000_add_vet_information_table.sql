-- Create vet_information table
-- This table stores veterinary clinic and vet information that can be shared across users

CREATE TABLE "public"."vet_information" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "clinic_name" varchar(255) NOT NULL,
  "vet_name" varchar(255) NOT NULL,
  "address" text NOT NULL,
  "phone" varchar(20) NOT NULL,
  "email" varchar(255) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Enable Row Level Security
ALTER TABLE "public"."vet_information" ENABLE ROW LEVEL SECURITY;

-- Create primary key
CREATE UNIQUE INDEX vet_information_pkey ON public.vet_information USING btree (id);
ALTER TABLE "public"."vet_information" ADD CONSTRAINT "vet_information_pkey" PRIMARY KEY USING INDEX "vet_information_pkey";

-- Create indexes for faster lookups
CREATE INDEX idx_vet_information_email ON public.vet_information(email);
CREATE INDEX idx_vet_information_clinic_name ON public.vet_information(clinic_name);

-- Create trigger function for updating updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_vet_information_updated_at
  BEFORE UPDATE ON public.vet_information
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
-- Allow authenticated users to read all vet information
CREATE POLICY "Allow authenticated users to read vet information"
ON public.vet_information
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert vet information
CREATE POLICY "Allow authenticated users to insert vet information"
ON public.vet_information
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update vet information
CREATE POLICY "Allow authenticated users to update vet information"
ON public.vet_information
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete vet information
CREATE POLICY "Allow authenticated users to delete vet information"
ON public.vet_information
FOR DELETE
TO authenticated
USING (true);

-- Grant permissions to roles
GRANT DELETE ON TABLE "public"."vet_information" TO "anon";
GRANT INSERT ON TABLE "public"."vet_information" TO "anon";
GRANT REFERENCES ON TABLE "public"."vet_information" TO "anon";
GRANT SELECT ON TABLE "public"."vet_information" TO "anon";
GRANT TRIGGER ON TABLE "public"."vet_information" TO "anon";
GRANT TRUNCATE ON TABLE "public"."vet_information" TO "anon";
GRANT UPDATE ON TABLE "public"."vet_information" TO "anon";

GRANT DELETE ON TABLE "public"."vet_information" TO "authenticated";
GRANT INSERT ON TABLE "public"."vet_information" TO "authenticated";
GRANT REFERENCES ON TABLE "public"."vet_information" TO "authenticated";
GRANT SELECT ON TABLE "public"."vet_information" TO "authenticated";
GRANT TRIGGER ON TABLE "public"."vet_information" TO "authenticated";
GRANT TRUNCATE ON TABLE "public"."vet_information" TO "authenticated";
GRANT UPDATE ON TABLE "public"."vet_information" TO "authenticated";

GRANT DELETE ON TABLE "public"."vet_information" TO "postgres";
GRANT INSERT ON TABLE "public"."vet_information" TO "postgres";
GRANT REFERENCES ON TABLE "public"."vet_information" TO "postgres";
GRANT SELECT ON TABLE "public"."vet_information" TO "postgres";
GRANT TRIGGER ON TABLE "public"."vet_information" TO "postgres";
GRANT TRUNCATE ON TABLE "public"."vet_information" TO "postgres";
GRANT UPDATE ON TABLE "public"."vet_information" TO "postgres";

GRANT DELETE ON TABLE "public"."vet_information" TO "service_role";
GRANT INSERT ON TABLE "public"."vet_information" TO "service_role";
GRANT REFERENCES ON TABLE "public"."vet_information" TO "service_role";
GRANT SELECT ON TABLE "public"."vet_information" TO "service_role";
GRANT TRIGGER ON TABLE "public"."vet_information" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."vet_information" TO "service_role";
GRANT UPDATE ON TABLE "public"."vet_information" TO "service_role";

-- Add vet_information_id column to pets table
ALTER TABLE "public"."pets" 
ADD COLUMN "vet_information_id" uuid REFERENCES public.vet_information(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_pets_vet_information_id ON public.pets(vet_information_id);
