alter table "public"."daily_medication_schedules" drop constraint "daily_medication_schedules_medication_id_fkey";

alter table "public"."monthly_medication_schedules" drop constraint "monthly_medication_schedules_medication_id_fkey";

alter table "public"."weekly_medication_schedules" drop constraint "weekly_medication_schedules_medication_id_fkey";

alter table "public"."daily_medication_schedules" add constraint "daily_medication_schedules_medication_id_fkey" FOREIGN KEY (medication_id) REFERENCES public.medicines(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."daily_medication_schedules" validate constraint "daily_medication_schedules_medication_id_fkey";

alter table "public"."monthly_medication_schedules" add constraint "monthly_medication_schedules_medication_id_fkey" FOREIGN KEY (medication_id) REFERENCES public.medicines(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."monthly_medication_schedules" validate constraint "monthly_medication_schedules_medication_id_fkey";

alter table "public"."weekly_medication_schedules" add constraint "weekly_medication_schedules_medication_id_fkey" FOREIGN KEY (medication_id) REFERENCES public.medicines(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."weekly_medication_schedules" validate constraint "weekly_medication_schedules_medication_id_fkey";


