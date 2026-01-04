-- Create pet_transfers table for pet ownership transfers
CREATE TABLE IF NOT EXISTS "public"."pet_transfers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "code" text NOT NULL,
    "pet_id" uuid NOT NULL,
    "from_user_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "to_user_id" uuid,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pet_transfers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pet_transfers_code_key" UNIQUE ("code"),
    CONSTRAINT "pet_transfers_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE,
    CONSTRAINT "pet_transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "pet_transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "pet_transfers_code_idx" ON "public"."pet_transfers" USING btree ("code");
CREATE INDEX IF NOT EXISTS "pet_transfers_pet_id_idx" ON "public"."pet_transfers" USING btree ("pet_id");
CREATE INDEX IF NOT EXISTS "pet_transfers_from_user_id_idx" ON "public"."pet_transfers" USING btree ("from_user_id");

-- Enable RLS
ALTER TABLE "public"."pet_transfers" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pet_transfers
-- Users can view transfers they created
CREATE POLICY "Users can view their own transfers"
    ON "public"."pet_transfers"
    FOR SELECT
    USING (auth.uid() = from_user_id);

-- Users can create transfers for their pets
CREATE POLICY "Users can create transfers for their pets"
    ON "public"."pet_transfers"
    FOR INSERT
    WITH CHECK (
        auth.uid() = from_user_id AND
        EXISTS (
            SELECT 1 FROM "public"."pets"
            WHERE id = pet_id AND user_id = auth.uid()
        )
    );

-- Users can update their own transfers
CREATE POLICY "Users can update their own transfers"
    ON "public"."pet_transfers"
    FOR UPDATE
    USING (auth.uid() = from_user_id);

-- Anyone can view active transfers (for verification)
CREATE POLICY "Anyone can view active transfers for verification"
    ON "public"."pet_transfers"
    FOR SELECT
    USING (
        is_active = true AND
        (expires_at IS NULL OR expires_at > now()) AND
        used_at IS NULL
    );

