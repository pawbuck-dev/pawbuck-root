drop policy "Policy with security definer functions" on "public"."daily_medication_schedules";

drop policy "Policy with security definer functions" on "public"."weekly_medication_schedules";

revoke delete on table "public"."daily_medication_schedules" from "anon";

revoke insert on table "public"."daily_medication_schedules" from "anon";

revoke references on table "public"."daily_medication_schedules" from "anon";

revoke select on table "public"."daily_medication_schedules" from "anon";

revoke trigger on table "public"."daily_medication_schedules" from "anon";

revoke truncate on table "public"."daily_medication_schedules" from "anon";

revoke update on table "public"."daily_medication_schedules" from "anon";

revoke delete on table "public"."daily_medication_schedules" from "authenticated";

revoke insert on table "public"."daily_medication_schedules" from "authenticated";

revoke references on table "public"."daily_medication_schedules" from "authenticated";

revoke select on table "public"."daily_medication_schedules" from "authenticated";

revoke trigger on table "public"."daily_medication_schedules" from "authenticated";

revoke truncate on table "public"."daily_medication_schedules" from "authenticated";

revoke update on table "public"."daily_medication_schedules" from "authenticated";

revoke delete on table "public"."daily_medication_schedules" from "service_role";

revoke insert on table "public"."daily_medication_schedules" from "service_role";

revoke references on table "public"."daily_medication_schedules" from "service_role";

revoke select on table "public"."daily_medication_schedules" from "service_role";

revoke trigger on table "public"."daily_medication_schedules" from "service_role";

revoke truncate on table "public"."daily_medication_schedules" from "service_role";

revoke update on table "public"."daily_medication_schedules" from "service_role";

revoke delete on table "public"."monthly_medication_schedules" from "anon";

revoke insert on table "public"."monthly_medication_schedules" from "anon";

revoke references on table "public"."monthly_medication_schedules" from "anon";

revoke select on table "public"."monthly_medication_schedules" from "anon";

revoke trigger on table "public"."monthly_medication_schedules" from "anon";

revoke truncate on table "public"."monthly_medication_schedules" from "anon";

revoke update on table "public"."monthly_medication_schedules" from "anon";

revoke delete on table "public"."monthly_medication_schedules" from "authenticated";

revoke insert on table "public"."monthly_medication_schedules" from "authenticated";

revoke references on table "public"."monthly_medication_schedules" from "authenticated";

revoke select on table "public"."monthly_medication_schedules" from "authenticated";

revoke trigger on table "public"."monthly_medication_schedules" from "authenticated";

revoke truncate on table "public"."monthly_medication_schedules" from "authenticated";

revoke update on table "public"."monthly_medication_schedules" from "authenticated";

revoke delete on table "public"."monthly_medication_schedules" from "service_role";

revoke insert on table "public"."monthly_medication_schedules" from "service_role";

revoke references on table "public"."monthly_medication_schedules" from "service_role";

revoke select on table "public"."monthly_medication_schedules" from "service_role";

revoke trigger on table "public"."monthly_medication_schedules" from "service_role";

revoke truncate on table "public"."monthly_medication_schedules" from "service_role";

revoke update on table "public"."monthly_medication_schedules" from "service_role";

revoke delete on table "public"."weekly_medication_schedules" from "anon";

revoke insert on table "public"."weekly_medication_schedules" from "anon";

revoke references on table "public"."weekly_medication_schedules" from "anon";

revoke select on table "public"."weekly_medication_schedules" from "anon";

revoke trigger on table "public"."weekly_medication_schedules" from "anon";

revoke truncate on table "public"."weekly_medication_schedules" from "anon";

revoke update on table "public"."weekly_medication_schedules" from "anon";

revoke delete on table "public"."weekly_medication_schedules" from "authenticated";

revoke insert on table "public"."weekly_medication_schedules" from "authenticated";

revoke references on table "public"."weekly_medication_schedules" from "authenticated";

revoke select on table "public"."weekly_medication_schedules" from "authenticated";

revoke trigger on table "public"."weekly_medication_schedules" from "authenticated";

revoke truncate on table "public"."weekly_medication_schedules" from "authenticated";

revoke update on table "public"."weekly_medication_schedules" from "authenticated";

revoke delete on table "public"."weekly_medication_schedules" from "service_role";

revoke insert on table "public"."weekly_medication_schedules" from "service_role";

revoke references on table "public"."weekly_medication_schedules" from "service_role";

revoke select on table "public"."weekly_medication_schedules" from "service_role";

revoke trigger on table "public"."weekly_medication_schedules" from "service_role";

revoke truncate on table "public"."weekly_medication_schedules" from "service_role";

revoke update on table "public"."weekly_medication_schedules" from "service_role";

alter table "public"."daily_medication_schedules" drop constraint "daily_medication_schedules_medication_id_fkey";

alter table "public"."monthly_medication_schedules" drop constraint "monthly_medication_schedules_medication_id_fkey";

alter table "public"."weekly_medication_schedules" drop constraint "weekly_medication_schedules_medication_id_fkey";

alter table "public"."daily_medication_schedules" drop constraint "daily_medication_schedules_pkey";

alter table "public"."monthly_medication_schedules" drop constraint "monthly_medication_schedules_pkey";

alter table "public"."weekly_medication_schedules" drop constraint "weekly_medication_schedules_pkey";

drop index if exists "public"."daily_medication_schedules_pkey";

drop index if exists "public"."monthly_medication_schedules_pkey";

drop index if exists "public"."weekly_medication_schedules_pkey";

drop table "public"."daily_medication_schedules";

drop table "public"."monthly_medication_schedules";

drop table "public"."weekly_medication_schedules";

alter table "public"."medicines" add column "schedules" json not null default '[]'::json;


