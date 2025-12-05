drop policy "Users can delete their own clinical exams" on "public"."clinical_exams";

drop policy "Users can insert their own clinical exams" on "public"."clinical_exams";

drop policy "Users can update their own clinical exams" on "public"."clinical_exams";

drop policy "Users can view their own clinical exams" on "public"."clinical_exams";

drop policy "Users can delete their pet's lab results" on "public"."lab_results";

drop policy "Users can insert lab results for their pets" on "public"."lab_results";

drop policy "Users can update their pet's lab results" on "public"."lab_results";

drop policy "Users can view their pet's lab results" on "public"."lab_results";

alter table "public"."medicines" enable row level security;

alter table "public"."pets" enable row level security;

alter table "public"."vaccinations" enable row level security;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_last_seen()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
    new.last_seen = now();
    return new;
end;$function$
;

grant delete on table "public"."push_tokens" to "postgres";

grant insert on table "public"."push_tokens" to "postgres";

grant references on table "public"."push_tokens" to "postgres";

grant select on table "public"."push_tokens" to "postgres";

grant trigger on table "public"."push_tokens" to "postgres";

grant truncate on table "public"."push_tokens" to "postgres";

grant update on table "public"."push_tokens" to "postgres";


  create policy "Policy with security definer functions"
  on "public"."clinical_exams"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Policy with security definer functions"
  on "public"."lab_results"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Policy with security definer functions"
  on "public"."medicines"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Policy with security definer functions"
  on "public"."pets"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Policy with security definer functions"
  on "public"."push_tokens"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Policy with security definer functions"
  on "public"."vaccinations"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



