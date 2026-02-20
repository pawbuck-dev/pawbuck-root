alter table "public"."message_threads" drop constraint "message_threads_reply_to_address_key";

drop index if exists "public"."message_threads_reply_to_address_key";


