-- Rover-style local marketplace domain: independent service providers (walkers, groomers, etc.)
-- Coexists with vet clinic booking (vet_bookings + PawBuck.API scheduling adapters).

CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  business_name text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT provider_profiles_one_per_user UNIQUE (user_id)
);

COMMENT ON TABLE public.provider_profiles IS 'Service provider identity; one row per auth user in provider role.';

CREATE TABLE IF NOT EXISTS public.service_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id uuid NOT NULL REFERENCES public.provider_profiles (id) ON DELETE CASCADE,
  service_type text NOT NULL,
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS service_offerings_profile_idx
  ON public.service_offerings (provider_profile_id);

CREATE TABLE IF NOT EXISTS public.service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id uuid NOT NULL REFERENCES public.provider_profiles (id) ON DELETE CASCADE,
  country_code text NOT NULL,
  region text,
  center_lat double precision,
  center_lng double precision,
  radius_km numeric,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS service_areas_profile_idx ON public.service_areas (provider_profile_id);
CREATE INDEX IF NOT EXISTS service_areas_country_idx ON public.service_areas (country_code);

CREATE TABLE IF NOT EXISTS public.marketplace_service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider_profile_id uuid NOT NULL REFERENCES public.provider_profiles (id) ON DELETE RESTRICT,
  pet_id uuid REFERENCES public.pets (id) ON DELETE SET NULL,
  service_offering_id uuid REFERENCES public.service_offerings (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested',
  start_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS marketplace_bookings_owner_idx
  ON public.marketplace_service_bookings (pet_owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_bookings_provider_idx
  ON public.marketplace_service_bookings (provider_profile_id, created_at DESC);

-- RLS -------------------------------------------------------------------------

ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_service_bookings ENABLE ROW LEVEL SECURITY;

-- provider_profiles: owners manage their own row
CREATE POLICY "provider_profiles_select_own"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "provider_profiles_insert_own"
  ON public.provider_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "provider_profiles_update_own"
  ON public.provider_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "provider_profiles_delete_own"
  ON public.provider_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- service_offerings: via owning profile
CREATE POLICY "service_offerings_select_visible"
  ON public.service_offerings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_offerings.provider_profile_id
        AND (p.user_id = auth.uid() OR service_offerings.active = true)
    )
  );

CREATE POLICY "service_offerings_insert_own"
  ON public.service_offerings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_offerings.provider_profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "service_offerings_update_own"
  ON public.service_offerings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_offerings.provider_profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_offerings.provider_profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "service_offerings_delete_own"
  ON public.service_offerings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_offerings.provider_profile_id AND p.user_id = auth.uid()
    )
  );

-- service_areas: owner of profile only (consumers discover via future search RPC)
CREATE POLICY "service_areas_select_own_or_active_offerings"
  ON public.service_areas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_areas.provider_profile_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.service_offerings o
      WHERE o.provider_profile_id = service_areas.provider_profile_id AND o.active = true
    )
  );

CREATE POLICY "service_areas_insert_own"
  ON public.service_areas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_areas.provider_profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "service_areas_update_own"
  ON public.service_areas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_areas.provider_profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_areas.provider_profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "service_areas_delete_own"
  ON public.service_areas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = service_areas.provider_profile_id AND p.user_id = auth.uid()
    )
  );

-- marketplace_service_bookings: pet owner and provider see relevant rows
CREATE POLICY "marketplace_bookings_select_parties"
  ON public.marketplace_service_bookings FOR SELECT TO authenticated
  USING (
    pet_owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = marketplace_service_bookings.provider_profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "marketplace_bookings_insert_owner"
  ON public.marketplace_service_bookings FOR INSERT TO authenticated
  WITH CHECK (pet_owner_user_id = auth.uid());

CREATE POLICY "marketplace_bookings_update_owner"
  ON public.marketplace_service_bookings FOR UPDATE TO authenticated
  USING (pet_owner_user_id = auth.uid())
  WITH CHECK (pet_owner_user_id = auth.uid());

CREATE POLICY "marketplace_bookings_update_provider"
  ON public.marketplace_service_bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = marketplace_service_bookings.provider_profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.id = marketplace_service_bookings.provider_profile_id AND p.user_id = auth.uid()
    )
  );

-- Grants
GRANT ALL ON public.provider_profiles TO authenticated;
GRANT ALL ON public.service_offerings TO authenticated;
GRANT ALL ON public.service_areas TO authenticated;
GRANT ALL ON public.marketplace_service_bookings TO authenticated;
GRANT ALL ON public.provider_profiles TO service_role;
GRANT ALL ON public.service_offerings TO service_role;
GRANT ALL ON public.service_areas TO service_role;
GRANT ALL ON public.marketplace_service_bookings TO service_role;
