-- Create household_invites table for family sharing
CREATE TABLE IF NOT EXISTS "public"."household_invites" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "code" text NOT NULL,
    "created_by" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "used_by" uuid,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "household_invites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "household_invites_code_key" UNIQUE ("code"),
    CONSTRAINT "household_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "household_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- Create household_members table to track family/household relationships
CREATE TABLE IF NOT EXISTS "public"."household_members" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "household_owner_id" uuid NOT NULL,
    "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "household_members_user_owner_unique" UNIQUE ("user_id", "household_owner_id"),
    CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "household_members_owner_id_fkey" FOREIGN KEY ("household_owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "household_invites_code_idx" ON "public"."household_invites" USING btree ("code");
CREATE INDEX IF NOT EXISTS "household_invites_created_by_idx" ON "public"."household_invites" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "household_members_user_id_idx" ON "public"."household_members" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "household_members_owner_id_idx" ON "public"."household_members" USING btree ("household_owner_id");

-- Enable RLS
ALTER TABLE "public"."household_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."household_members" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for household_invites
-- Users can view their own invites
CREATE POLICY "Users can view their own invites"
    ON "public"."household_invites"
    FOR SELECT
    USING (auth.uid() = created_by);

-- Users can create their own invites
CREATE POLICY "Users can create their own invites"
    ON "public"."household_invites"
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Users can update their own invites
CREATE POLICY "Users can update their own invites"
    ON "public"."household_invites"
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Anyone can view active invites (for verification)
CREATE POLICY "Anyone can view active invites for verification"
    ON "public"."household_invites"
    FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS Policies for household_members
-- Users can view their own household memberships
CREATE POLICY "Users can view their own memberships"
    ON "public"."household_members"
    FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = household_owner_id);

-- Household owners can insert members
CREATE POLICY "Owners can add members"
    ON "public"."household_members"
    FOR INSERT
    WITH CHECK (auth.uid() = household_owner_id);

-- Users can update their own membership status
CREATE POLICY "Users can update their own membership"
    ON "public"."household_members"
    FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = household_owner_id);

