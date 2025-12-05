drop trigger if exists "handle_lab_results_updated_at" on "public"."lab_results";

drop function if exists "public"."handle_lab_results_updated_at"();


  create table "public"."push_tokens" (
    "user_id" uuid not null default auth.uid(),
    "device_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "last_seen" timestamp with time zone not null default now()
      );


alter table "public"."push_tokens" enable row level security;

CREATE UNIQUE INDEX push_tokens_pkey ON public.push_tokens USING btree (user_id, device_id);

alter table "public"."push_tokens" add constraint "push_tokens_pkey" PRIMARY KEY using index "push_tokens_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_last_seen()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
    new.last_seen = now();
    return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
    new.updated_at = now();
    return new;
end;$function$
;

grant delete on table "public"."push_tokens" to "anon";

grant insert on table "public"."push_tokens" to "anon";

grant references on table "public"."push_tokens" to "anon";

grant select on table "public"."push_tokens" to "anon";

grant trigger on table "public"."push_tokens" to "anon";

grant truncate on table "public"."push_tokens" to "anon";

grant update on table "public"."push_tokens" to "anon";

grant delete on table "public"."push_tokens" to "authenticated";

grant insert on table "public"."push_tokens" to "authenticated";

grant references on table "public"."push_tokens" to "authenticated";

grant select on table "public"."push_tokens" to "authenticated";

grant trigger on table "public"."push_tokens" to "authenticated";

grant truncate on table "public"."push_tokens" to "authenticated";

grant update on table "public"."push_tokens" to "authenticated";

grant delete on table "public"."push_tokens" to "postgres";

grant insert on table "public"."push_tokens" to "postgres";

grant references on table "public"."push_tokens" to "postgres";

grant select on table "public"."push_tokens" to "postgres";

grant trigger on table "public"."push_tokens" to "postgres";

grant truncate on table "public"."push_tokens" to "postgres";

grant update on table "public"."push_tokens" to "postgres";

grant delete on table "public"."push_tokens" to "service_role";

grant insert on table "public"."push_tokens" to "service_role";

grant references on table "public"."push_tokens" to "service_role";

grant select on table "public"."push_tokens" to "service_role";

grant trigger on table "public"."push_tokens" to "service_role";

grant truncate on table "public"."push_tokens" to "service_role";

grant update on table "public"."push_tokens" to "service_role";

CREATE TRIGGER handle_push_token_last_seen BEFORE UPDATE ON public.push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_last_seen();

CREATE TRIGGER handle_lab_results_updated_at BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


