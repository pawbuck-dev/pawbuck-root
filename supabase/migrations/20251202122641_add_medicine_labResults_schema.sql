
  create table "public"."lab_results" (
    "id" uuid not null default gen_random_uuid(),
    "pet_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "test_type" text not null,
    "lab_name" text not null,
    "test_date" timestamp with time zone,
    "ordered_by" text,
    "results" jsonb not null default '[]'::jsonb,
    "document_url" text,
    "confidence" integer
      );


alter table "public"."lab_results" enable row level security;


  create table "public"."medicines" (
    "id" uuid not null default gen_random_uuid(),
    "pet_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "type" text not null,
    "dosage" text not null,
    "frequency" text not null,
    "custom_frequency_value" integer,
    "custom_frequency_unit" text,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "prescribed_by" text,
    "purpose" text,
    "last_given_at" timestamp with time zone,
    "next_due_date" timestamp with time zone,
    "reminder_enabled" boolean not null default true,
    "reminder_timing" text default 'Day of'::text,
    "updated_at" timestamp with time zone not null default now(),
    "user_id" uuid not null default auth.uid()
      );


CREATE INDEX lab_results_pet_id_idx ON public.lab_results USING btree (pet_id);

CREATE UNIQUE INDEX lab_results_pkey ON public.lab_results USING btree (id);

CREATE INDEX lab_results_test_date_idx ON public.lab_results USING btree (test_date);

CREATE INDEX lab_results_user_id_idx ON public.lab_results USING btree (user_id);

CREATE UNIQUE INDEX medicines_pkey ON public.medicines USING btree (id);

alter table "public"."lab_results" add constraint "lab_results_pkey" PRIMARY KEY using index "lab_results_pkey";

alter table "public"."medicines" add constraint "medicines_pkey" PRIMARY KEY using index "medicines_pkey";

alter table "public"."lab_results" add constraint "lab_results_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE not valid;

alter table "public"."lab_results" validate constraint "lab_results_pet_id_fkey";

alter table "public"."medicines" add constraint "medicines_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES public.pets(id) not valid;

alter table "public"."medicines" validate constraint "medicines_pet_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_lab_results_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$
;

grant delete on table "public"."lab_results" to "anon";

grant insert on table "public"."lab_results" to "anon";

grant references on table "public"."lab_results" to "anon";

grant select on table "public"."lab_results" to "anon";

grant trigger on table "public"."lab_results" to "anon";

grant truncate on table "public"."lab_results" to "anon";

grant update on table "public"."lab_results" to "anon";

grant delete on table "public"."lab_results" to "authenticated";

grant insert on table "public"."lab_results" to "authenticated";

grant references on table "public"."lab_results" to "authenticated";

grant select on table "public"."lab_results" to "authenticated";

grant trigger on table "public"."lab_results" to "authenticated";

grant truncate on table "public"."lab_results" to "authenticated";

grant update on table "public"."lab_results" to "authenticated";

grant delete on table "public"."lab_results" to "service_role";

grant insert on table "public"."lab_results" to "service_role";

grant references on table "public"."lab_results" to "service_role";

grant select on table "public"."lab_results" to "service_role";

grant trigger on table "public"."lab_results" to "service_role";

grant truncate on table "public"."lab_results" to "service_role";

grant update on table "public"."lab_results" to "service_role";

grant delete on table "public"."medicines" to "anon";

grant insert on table "public"."medicines" to "anon";

grant references on table "public"."medicines" to "anon";

grant select on table "public"."medicines" to "anon";

grant trigger on table "public"."medicines" to "anon";

grant truncate on table "public"."medicines" to "anon";

grant update on table "public"."medicines" to "anon";

grant delete on table "public"."medicines" to "authenticated";

grant insert on table "public"."medicines" to "authenticated";

grant references on table "public"."medicines" to "authenticated";

grant select on table "public"."medicines" to "authenticated";

grant trigger on table "public"."medicines" to "authenticated";

grant truncate on table "public"."medicines" to "authenticated";

grant update on table "public"."medicines" to "authenticated";

grant delete on table "public"."medicines" to "service_role";

grant insert on table "public"."medicines" to "service_role";

grant references on table "public"."medicines" to "service_role";

grant select on table "public"."medicines" to "service_role";

grant trigger on table "public"."medicines" to "service_role";

grant truncate on table "public"."medicines" to "service_role";

grant update on table "public"."medicines" to "service_role";


  create policy "Users can delete their pet's lab results"
  on "public"."lab_results"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert lab results for their pets"
  on "public"."lab_results"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their pet's lab results"
  on "public"."lab_results"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their pet's lab results"
  on "public"."lab_results"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER handle_lab_results_updated_at BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.handle_lab_results_updated_at();


