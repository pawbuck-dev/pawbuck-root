


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_email_id_available"("p_email_id" "text", "p_exclude_pet_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.pets 
    WHERE lower(email_id) = lower(p_email_id)
    AND (p_exclude_pet_id IS NULL OR id != p_exclude_pet_id)
  );
END;
$$;


ALTER FUNCTION "public"."check_email_id_available"("p_email_id" "text", "p_exclude_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_preferences"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, vaccination_reminder_days)
  VALUES (p_user_id, 14)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."create_user_preferences"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_seen"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$begin
    new.last_seen = now();
    return new;
end;$$;


ALTER FUNCTION "public"."update_last_seen"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_message_thread_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_message_thread_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$begin
    new.updated_at = now();
    return new;
end;$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_preferences_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clinical_exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "exam_date" "date" NOT NULL,
    "clinic_name" "text",
    "vet_name" "text",
    "exam_type" "text",
    "weight_value" numeric,
    "weight_unit" "text",
    "temperature" numeric,
    "heart_rate" integer,
    "respiratory_rate" integer,
    "findings" "text",
    "follow_up_date" "date",
    "document_url" "text",
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "validity_date" "date"
);


ALTER TABLE "public"."clinical_exams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clinical_exams"."validity_date" IS 'Validity/expiry date for travel documents. NULL for other exam types.';



CREATE TABLE IF NOT EXISTS "public"."country_vaccine_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country" character varying(100) NOT NULL,
    "animal_type" character varying(20) NOT NULL,
    "vaccine_name" character varying(100) NOT NULL,
    "canonical_key" character varying(50) NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "frequency_months" integer,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."country_vaccine_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."household_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "used_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."household_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."household_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "household_owner_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."household_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "test_type" "text" NOT NULL,
    "lab_name" "text" NOT NULL,
    "test_date" timestamp with time zone,
    "ordered_by" "text",
    "results" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "document_url" "text",
    "confidence" integer
);


ALTER TABLE "public"."lab_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medication_doses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "medication_id" "uuid" NOT NULL,
    "scheduled_time" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


ALTER TABLE "public"."medication_doses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medicines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "dosage" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "custom_frequency_value" integer,
    "custom_frequency_unit" "text",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "prescribed_by" "text",
    "purpose" "text",
    "last_given_at" timestamp with time zone,
    "next_due_date" timestamp with time zone,
    "reminder_enabled" boolean DEFAULT true NOT NULL,
    "reminder_timing" "text" DEFAULT 'Day of'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "schedules" json DEFAULT '[]'::json NOT NULL,
    "document_url" "text"
);


ALTER TABLE "public"."medicines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "reply_to_address" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_email_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sender_email" "text" NOT NULL,
    "s3_bucket" "text" NOT NULL,
    "s3_key" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "validation_status" "text" DEFAULT 'pending'::"text",
    "validation_errors" "jsonb" DEFAULT '{}'::"jsonb",
    "document_type" "text",
    "attachment_url" "text",
    CONSTRAINT "pending_email_approvals_validation_status_check" CHECK (("validation_status" = ANY (ARRAY['pending'::"text", 'correct'::"text", 'incorrect'::"text"])))
);


ALTER TABLE "public"."pending_email_approvals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pending_email_approvals"."validation_status" IS 'Validation status: pending (not yet validated), correct (pet info matches), incorrect (pet info mismatch detected)';



COMMENT ON COLUMN "public"."pending_email_approvals"."validation_errors" IS 'JSON object storing validation errors, e.g., {"microchip_number": "Mismatch detected", "pet_name": "Mismatch detected"}';



COMMENT ON COLUMN "public"."pending_email_approvals"."document_type" IS 'Type of document in attachment (e.g., "travel_certificate", "vaccination", "lab_result", "exam")';



COMMENT ON COLUMN "public"."pending_email_approvals"."attachment_url" IS 'URL to the attachment/document for preview';



CREATE TABLE IF NOT EXISTS "public"."pet_care_team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "care_team_member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."pet_care_team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_email_list" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_id" "text" NOT NULL,
    "pet_id" "uuid" DEFAULT "gen_random_uuid"(),
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "is_blocked" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."pet_email_list" OWNER TO "postgres";


COMMENT ON TABLE "public"."pet_email_list" IS 'whitelisted email addresses for a pet';



ALTER TABLE "public"."pet_email_list" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pet_email_whitelist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pet_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "to_user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."pet_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pets" (
    "name" "text" NOT NULL,
    "animal_type" "text" NOT NULL,
    "breed" "text" NOT NULL,
    "sex" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "country" "text" NOT NULL,
    "weight_unit" "text" NOT NULL,
    "weight_value" numeric NOT NULL,
    "microchip_number" "text",
    "photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "vet_information_id" "uuid",
    "email_id" "text" NOT NULL,
    "color" "text"
);


ALTER TABLE "public"."pets" OWNER TO "postgres";


COMMENT ON TABLE "public"."pets" IS 'List of all the pet details';



CREATE TABLE IF NOT EXISTS "public"."processed_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "s3_key" "text" NOT NULL,
    "pet_id" "uuid",
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "attachment_count" integer DEFAULT 0,
    "success" boolean DEFAULT true
);


ALTER TABLE "public"."processed_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "device_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token" "text" NOT NULL
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thread_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "direction" "text" NOT NULL,
    "sender_email" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "cc" "text"[],
    "bcc" "text"[],
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "thread_messages_direction_check" CHECK (("direction" = ANY (ARRAY['outbound'::"text", 'inbound'::"text"])))
);


ALTER TABLE "public"."thread_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vaccination_reminder_days" integer DEFAULT 14 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text",
    "phone" "text",
    "address" "text"
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_preferences"."full_name" IS 'Full name of the pet parent/owner';



COMMENT ON COLUMN "public"."user_preferences"."phone" IS 'Phone number of the pet parent/owner';



COMMENT ON COLUMN "public"."user_preferences"."address" IS 'Address of the pet parent/owner';



CREATE TABLE IF NOT EXISTS "public"."vaccinations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "document_url" "text",
    "next_due_date" timestamp with time zone,
    "notes" "text",
    "pet_id" "uuid" NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "name" "text" NOT NULL,
    "clinic_name" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


ALTER TABLE "public"."vaccinations" OWNER TO "postgres";


COMMENT ON TABLE "public"."vaccinations" IS 'vaccination details of pets.';



CREATE TABLE IF NOT EXISTS "public"."vaccine_equivalencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_name" "text" NOT NULL,
    "variant_name" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vaccine_equivalencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vet_information" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_name" character varying(255) NOT NULL,
    "vet_name" character varying(255) NOT NULL,
    "address" "text" NOT NULL,
    "phone" character varying(20) NOT NULL,
    "email" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" "text" DEFAULT 'veterinarian'::"text",
    CONSTRAINT "vet_information_type_check" CHECK (("type" = ANY (ARRAY['veterinarian'::"text", 'dog_walker'::"text", 'groomer'::"text", 'pet_sitter'::"text", 'boarding'::"text"])))
);


ALTER TABLE "public"."vet_information" OWNER TO "postgres";


COMMENT ON COLUMN "public"."vet_information"."type" IS 'Type of care team member: veterinarian, dog_walker, groomer, pet_sitter, or boarding';



ALTER TABLE ONLY "public"."clinical_exams"
    ADD CONSTRAINT "clinical_exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_vaccine_requirements"
    ADD CONSTRAINT "country_vaccine_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_user_owner_unique" UNIQUE ("user_id", "household_owner_id");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_doses"
    ADD CONSTRAINT "medication_doses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medicines"
    ADD CONSTRAINT "medicines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_reply_to_address_key" UNIQUE ("reply_to_address");



ALTER TABLE ONLY "public"."pending_email_approvals"
    ADD CONSTRAINT "pending_email_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_care_team_members"
    ADD CONSTRAINT "pet_care_team_members_pet_id_care_team_member_id_key" UNIQUE ("pet_id", "care_team_member_id");



ALTER TABLE ONLY "public"."pet_care_team_members"
    ADD CONSTRAINT "pet_care_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_email_list"
    ADD CONSTRAINT "pet_email_whitelist_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."pet_email_list"
    ADD CONSTRAINT "pet_email_whitelist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_transfers"
    ADD CONSTRAINT "pet_transfers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."pet_transfers"
    ADD CONSTRAINT "pet_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_email_id_key" UNIQUE ("email_id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_emails"
    ADD CONSTRAINT "processed_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_emails"
    ADD CONSTRAINT "processed_emails_s3_key_key" UNIQUE ("s3_key");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("user_id", "device_id");



ALTER TABLE ONLY "public"."thread_messages"
    ADD CONSTRAINT "thread_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_vaccine_requirements"
    ADD CONSTRAINT "unique_country_animal_vaccine" UNIQUE ("country", "animal_type", "vaccine_name");



ALTER TABLE ONLY "public"."pending_email_approvals"
    ADD CONSTRAINT "unique_pending_email_s3_key" UNIQUE ("s3_key");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."vaccinations"
    ADD CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vaccine_equivalencies"
    ADD CONSTRAINT "vaccine_equivalencies_canonical_name_variant_name_key" UNIQUE ("canonical_name", "variant_name");



ALTER TABLE ONLY "public"."vaccine_equivalencies"
    ADD CONSTRAINT "vaccine_equivalencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vet_information"
    ADD CONSTRAINT "vet_information_pkey" PRIMARY KEY ("id");



CREATE INDEX "household_invites_code_idx" ON "public"."household_invites" USING "btree" ("code");



CREATE INDEX "household_invites_created_by_idx" ON "public"."household_invites" USING "btree" ("created_by");



CREATE INDEX "household_members_owner_id_idx" ON "public"."household_members" USING "btree" ("household_owner_id");



CREATE INDEX "household_members_user_id_idx" ON "public"."household_members" USING "btree" ("user_id");



CREATE INDEX "idx_country_vaccine_requirements_canonical" ON "public"."country_vaccine_requirements" USING "btree" ("canonical_key");



CREATE INDEX "idx_country_vaccine_requirements_country_animal" ON "public"."country_vaccine_requirements" USING "btree" ("country", "animal_type");



CREATE INDEX "idx_message_threads_pet_id" ON "public"."message_threads" USING "btree" ("pet_id");



CREATE INDEX "idx_message_threads_reply_to_address" ON "public"."message_threads" USING "btree" ("reply_to_address");



CREATE INDEX "idx_message_threads_user_id" ON "public"."message_threads" USING "btree" ("user_id");



CREATE INDEX "idx_pending_email_approvals_pet_id" ON "public"."pending_email_approvals" USING "btree" ("pet_id");



CREATE INDEX "idx_pending_email_approvals_status" ON "public"."pending_email_approvals" USING "btree" ("status");



CREATE INDEX "idx_pending_email_approvals_user_id" ON "public"."pending_email_approvals" USING "btree" ("user_id");



CREATE INDEX "idx_pending_email_approvals_validation_status" ON "public"."pending_email_approvals" USING "btree" ("validation_status") WHERE ("validation_status" = 'incorrect'::"text");



CREATE INDEX "idx_pet_care_team_members_care_team_member_id" ON "public"."pet_care_team_members" USING "btree" ("care_team_member_id");



CREATE INDEX "idx_pet_care_team_members_pet_id" ON "public"."pet_care_team_members" USING "btree" ("pet_id");



CREATE INDEX "idx_pets_vet_information_id" ON "public"."pets" USING "btree" ("vet_information_id");



CREATE INDEX "idx_thread_messages_sent_at" ON "public"."thread_messages" USING "btree" ("sent_at");



CREATE INDEX "idx_thread_messages_thread_id" ON "public"."thread_messages" USING "btree" ("thread_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_vaccine_equivalencies_canonical" ON "public"."vaccine_equivalencies" USING "btree" ("canonical_name");



CREATE INDEX "idx_vaccine_equivalencies_variant" ON "public"."vaccine_equivalencies" USING "btree" ("variant_name");



CREATE INDEX "idx_vet_information_clinic_name" ON "public"."vet_information" USING "btree" ("clinic_name");



CREATE INDEX "idx_vet_information_email" ON "public"."vet_information" USING "btree" ("email");



CREATE INDEX "idx_vet_information_type" ON "public"."vet_information" USING "btree" ("type");



CREATE INDEX "lab_results_pet_id_idx" ON "public"."lab_results" USING "btree" ("pet_id");



CREATE INDEX "lab_results_test_date_idx" ON "public"."lab_results" USING "btree" ("test_date");



CREATE INDEX "lab_results_user_id_idx" ON "public"."lab_results" USING "btree" ("user_id");



CREATE INDEX "medication_doses_medication_id_idx" ON "public"."medication_doses" USING "btree" ("medication_id");



CREATE INDEX "medication_doses_pet_id_idx" ON "public"."medication_doses" USING "btree" ("pet_id");



CREATE INDEX "medication_doses_scheduled_time_idx" ON "public"."medication_doses" USING "btree" ("scheduled_time");



CREATE INDEX "medication_doses_user_id_idx" ON "public"."medication_doses" USING "btree" ("user_id");



CREATE UNIQUE INDEX "medicines_pet_name_start_date_unique_idx" ON "public"."medicines" USING "btree" ("pet_id", "lower"(TRIM(BOTH FROM "name")), COALESCE((("start_date" AT TIME ZONE 'UTC'::"text"))::"date", '1970-01-01'::"date"));



COMMENT ON INDEX "public"."medicines_pet_name_start_date_unique_idx" IS 'Prevents duplicate medications for the same pet with the same medication name and start date';



CREATE UNIQUE INDEX "pet_email_list_pet_id_email_id_key" ON "public"."pet_email_list" USING "btree" ("pet_id", "email_id");



CREATE INDEX "pet_transfers_code_idx" ON "public"."pet_transfers" USING "btree" ("code");



CREATE INDEX "pet_transfers_from_user_id_idx" ON "public"."pet_transfers" USING "btree" ("from_user_id");



CREATE INDEX "pet_transfers_pet_id_idx" ON "public"."pet_transfers" USING "btree" ("pet_id");



CREATE INDEX "pets_deleted_at_idx" ON "public"."pets" USING "btree" ("deleted_at");



CREATE UNIQUE INDEX "pets_email_id_unique_idx" ON "public"."pets" USING "btree" ("lower"("email_id")) WHERE ("deleted_at" IS NULL);



CREATE INDEX "processed_emails_pet_id_idx" ON "public"."processed_emails" USING "btree" ("pet_id");



CREATE INDEX "processed_emails_s3_key_idx" ON "public"."processed_emails" USING "btree" ("s3_key");



CREATE UNIQUE INDEX "vaccinations_pet_name_date_unique_idx" ON "public"."vaccinations" USING "btree" ("pet_id", "lower"(TRIM(BOTH FROM "name")), ((("date" AT TIME ZONE 'UTC'::"text"))::"date"));



COMMENT ON INDEX "public"."vaccinations_pet_name_date_unique_idx" IS 'Prevents duplicate vaccinations for the same pet with the same vaccine name and date';



CREATE OR REPLACE TRIGGER "handle_lab_results_updated_at" BEFORE UPDATE ON "public"."lab_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "handle_push_token_last_seen" BEFORE UPDATE ON "public"."push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_last_seen"();



CREATE OR REPLACE TRIGGER "update_message_threads_updated_at" BEFORE UPDATE ON "public"."message_threads" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_thread_updated_at"();



CREATE OR REPLACE TRIGGER "update_vet_information_updated_at" BEFORE UPDATE ON "public"."vet_information" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_preferences_updated_at"();



ALTER TABLE ONLY "public"."clinical_exams"
    ADD CONSTRAINT "clinical_exams_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id");



ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_owner_id_fkey" FOREIGN KEY ("household_owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_doses"
    ADD CONSTRAINT "medication_doses_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "public"."medicines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_doses"
    ADD CONSTRAINT "medication_doses_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medicines"
    ADD CONSTRAINT "medicines_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_email_approvals"
    ADD CONSTRAINT "pending_email_approvals_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_care_team_members"
    ADD CONSTRAINT "pet_care_team_members_care_team_member_id_fkey" FOREIGN KEY ("care_team_member_id") REFERENCES "public"."vet_information"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_care_team_members"
    ADD CONSTRAINT "pet_care_team_members_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_email_list"
    ADD CONSTRAINT "pet_email_whitelist_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pet_transfers"
    ADD CONSTRAINT "pet_transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_transfers"
    ADD CONSTRAINT "pet_transfers_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_transfers"
    ADD CONSTRAINT "pet_transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_vet_information_id_fkey" FOREIGN KEY ("vet_information_id") REFERENCES "public"."vet_information"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."processed_emails"
    ADD CONSTRAINT "processed_emails_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thread_messages"
    ADD CONSTRAINT "thread_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vaccinations"
    ADD CONSTRAINT "vaccinations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Allow anon users to read vaccine equivalencies" ON "public"."vaccine_equivalencies" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon users to read vaccine requirements" ON "public"."country_vaccine_requirements" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow authenticated users to delete vet information" ON "public"."vet_information" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert vet information" ON "public"."vet_information" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read vaccine equivalencies" ON "public"."vaccine_equivalencies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read vaccine requirements" ON "public"."country_vaccine_requirements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read vet information" ON "public"."vet_information" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update vet information" ON "public"."vet_information" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can view active invites for verification" ON "public"."household_invites" FOR SELECT USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Anyone can view active transfers for verification" ON "public"."pet_transfers" FOR SELECT USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())) AND ("used_at" IS NULL)));



CREATE POLICY "Owners can add members" ON "public"."household_members" FOR INSERT WITH CHECK (("auth"."uid"() = "household_owner_id"));



CREATE POLICY "Policy with security definer functions" ON "public"."clinical_exams" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Policy with security definer functions" ON "public"."lab_results" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Policy with security definer functions" ON "public"."medicines" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Policy with security definer functions" ON "public"."pets" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Policy with security definer functions" ON "public"."push_tokens" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Policy with security definer functions" ON "public"."vaccinations" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Service role can insert pending approvals" ON "public"."pending_email_approvals" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Users can create messages in their threads" ON "public"."thread_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."message_threads"
  WHERE (("message_threads"."id" = "thread_messages"."thread_id") AND ("message_threads"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own invites" ON "public"."household_invites" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create their own message threads" ON "public"."message_threads" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create transfers for their pets" ON "public"."pet_transfers" FOR INSERT WITH CHECK ((("auth"."uid"() = "from_user_id") AND (EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_transfers"."pet_id") AND ("pets"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete their own email list" ON "public"."pet_email_list" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own medication doses" ON "public"."medication_doses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pending approvals" ON "public"."pending_email_approvals" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own email list" ON "public"."pet_email_list" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own medication doses" ON "public"."medication_doses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can link care team members to their pets" ON "public"."pet_care_team_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_care_team_members"."pet_id") AND ("pets"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can unlink care team members from their pets" ON "public"."pet_care_team_members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_care_team_members"."pet_id") AND ("pets"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own email list" ON "public"."pet_email_list" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own invites" ON "public"."household_invites" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own medication doses" ON "public"."medication_doses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own membership" ON "public"."household_members" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "household_owner_id")));



CREATE POLICY "Users can update their own message threads" ON "public"."message_threads" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pending approvals" ON "public"."pending_email_approvals" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own transfers" ON "public"."pet_transfers" FOR UPDATE USING (("auth"."uid"() = "from_user_id"));



CREATE POLICY "Users can view care team members for their pets" ON "public"."pet_care_team_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_care_team_members"."pet_id") AND ("pets"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages in their threads" ON "public"."thread_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."message_threads"
  WHERE (("message_threads"."id" = "thread_messages"."thread_id") AND ("message_threads"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own email list" ON "public"."pet_email_list" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own invites" ON "public"."household_invites" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own medication doses" ON "public"."medication_doses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own memberships" ON "public"."household_members" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "household_owner_id")));



CREATE POLICY "Users can view their own message threads" ON "public"."message_threads" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pending approvals" ON "public"."pending_email_approvals" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view their own transfers" ON "public"."pet_transfers" FOR SELECT USING (("auth"."uid"() = "from_user_id"));



ALTER TABLE "public"."clinical_exams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_vaccine_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."household_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."household_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medication_doses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medicines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_email_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_care_team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_email_list" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_transfers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processed_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."thread_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vaccinations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vaccine_equivalencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vet_information" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



































































u





















































































GRANT ALL ON FUNCTION "public"."check_email_id_available"("p_email_id" "text", "p_exclude_pet_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_id_available"("p_email_id" "text", "p_exclude_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_id_available"("p_email_id" "text", "p_exclude_pet_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_preferences"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_preferences"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_preferences"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_seen"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_seen"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_seen"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_message_thread_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_message_thread_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_message_thread_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."clinical_exams" TO "anon";
GRANT ALL ON TABLE "public"."clinical_exams" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_exams" TO "service_role";



GRANT ALL ON TABLE "public"."country_vaccine_requirements" TO "anon";
GRANT ALL ON TABLE "public"."country_vaccine_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."country_vaccine_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."household_invites" TO "anon";
GRANT ALL ON TABLE "public"."household_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."household_invites" TO "service_role";



GRANT ALL ON TABLE "public"."household_members" TO "anon";
GRANT ALL ON TABLE "public"."household_members" TO "authenticated";
GRANT ALL ON TABLE "public"."household_members" TO "service_role";



GRANT ALL ON TABLE "public"."lab_results" TO "anon";
GRANT ALL ON TABLE "public"."lab_results" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_results" TO "service_role";



GRANT ALL ON TABLE "public"."medication_doses" TO "anon";
GRANT ALL ON TABLE "public"."medication_doses" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_doses" TO "service_role";



GRANT ALL ON TABLE "public"."medicines" TO "anon";
GRANT ALL ON TABLE "public"."medicines" TO "authenticated";
GRANT ALL ON TABLE "public"."medicines" TO "service_role";



GRANT ALL ON TABLE "public"."message_threads" TO "anon";
GRANT ALL ON TABLE "public"."message_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_threads" TO "service_role";



GRANT ALL ON TABLE "public"."pending_email_approvals" TO "anon";
GRANT ALL ON TABLE "public"."pending_email_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_email_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."pet_care_team_members" TO "anon";
GRANT ALL ON TABLE "public"."pet_care_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_care_team_members" TO "service_role";



GRANT ALL ON TABLE "public"."pet_email_list" TO "anon";
GRANT ALL ON TABLE "public"."pet_email_list" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_email_list" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pet_email_whitelist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pet_email_whitelist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pet_email_whitelist_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pet_transfers" TO "anon";
GRANT ALL ON TABLE "public"."pet_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."pets" TO "anon";
GRANT ALL ON TABLE "public"."pets" TO "authenticated";
GRANT ALL ON TABLE "public"."pets" TO "service_role";



GRANT ALL ON TABLE "public"."processed_emails" TO "anon";
GRANT ALL ON TABLE "public"."processed_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_emails" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."thread_messages" TO "anon";
GRANT ALL ON TABLE "public"."thread_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."thread_messages" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."vaccinations" TO "anon";
GRANT ALL ON TABLE "public"."vaccinations" TO "authenticated";
GRANT ALL ON TABLE "public"."vaccinations" TO "service_role";



GRANT ALL ON TABLE "public"."vaccine_equivalencies" TO "anon";
GRANT ALL ON TABLE "public"."vaccine_equivalencies" TO "authenticated";
GRANT ALL ON TABLE "public"."vaccine_equivalencies" TO "service_role";



GRANT ALL ON TABLE "public"."vet_information" TO "anon";
GRANT ALL ON TABLE "public"."vet_information" TO "authenticated";
GRANT ALL ON TABLE "public"."vet_information" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































