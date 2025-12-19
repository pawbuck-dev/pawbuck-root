alter table "public"."push_tokens" add column "token" text not null;

CREATE UNIQUE INDEX push_tokens_token_key ON public.push_tokens USING btree (token);

alter table "public"."push_tokens" add constraint "push_tokens_token_key" UNIQUE using index "push_tokens_token_key";

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


