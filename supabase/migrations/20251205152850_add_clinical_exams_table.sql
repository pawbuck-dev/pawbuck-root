
  create table "public"."clinical_exams" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null,
    "exam_date" date not null,
    "clinic_name" text,
    "vet_name" text,
    "exam_type" text,
    "weight_value" numeric,
    "weight_unit" text,
    "temperature" numeric,
    "heart_rate" integer,
    "respiratory_rate" integer,
    "findings" text,
    "follow_up_date" date,
    "document_url" text,
    "notes" text,
    "updated_at" timestamp with time zone not null default now(),
    "user_id" uuid not null default auth.uid(),
    "pet_id" uuid not null
      );


alter table "public"."clinical_exams" enable row level security;

CREATE UNIQUE INDEX clinical_exams_pkey ON public.clinical_exams USING btree (id);

alter table "public"."clinical_exams" add constraint "clinical_exams_pkey" PRIMARY KEY using index "clinical_exams_pkey";

alter table "public"."clinical_exams" add constraint "clinical_exams_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES public.pets(id) not valid;

alter table "public"."clinical_exams" validate constraint "clinical_exams_pet_id_fkey";

grant delete on table "public"."clinical_exams" to "anon";

grant insert on table "public"."clinical_exams" to "anon";

grant references on table "public"."clinical_exams" to "anon";

grant select on table "public"."clinical_exams" to "anon";

grant trigger on table "public"."clinical_exams" to "anon";

grant truncate on table "public"."clinical_exams" to "anon";

grant update on table "public"."clinical_exams" to "anon";

grant delete on table "public"."clinical_exams" to "authenticated";

grant insert on table "public"."clinical_exams" to "authenticated";

grant references on table "public"."clinical_exams" to "authenticated";

grant select on table "public"."clinical_exams" to "authenticated";

grant trigger on table "public"."clinical_exams" to "authenticated";

grant truncate on table "public"."clinical_exams" to "authenticated";

grant update on table "public"."clinical_exams" to "authenticated";

grant delete on table "public"."clinical_exams" to "postgres";

grant insert on table "public"."clinical_exams" to "postgres";

grant references on table "public"."clinical_exams" to "postgres";

grant select on table "public"."clinical_exams" to "postgres";

grant trigger on table "public"."clinical_exams" to "postgres";

grant truncate on table "public"."clinical_exams" to "postgres";

grant update on table "public"."clinical_exams" to "postgres";

grant delete on table "public"."clinical_exams" to "service_role";

grant insert on table "public"."clinical_exams" to "service_role";

grant references on table "public"."clinical_exams" to "service_role";

grant select on table "public"."clinical_exams" to "service_role";

grant trigger on table "public"."clinical_exams" to "service_role";

grant truncate on table "public"."clinical_exams" to "service_role";

grant update on table "public"."clinical_exams" to "service_role";


