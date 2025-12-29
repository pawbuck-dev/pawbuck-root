-- Change weight column from integer to numeric to support decimal values
ALTER TABLE "public"."pets" ALTER COLUMN "weight" TYPE numeric USING "weight"::numeric;

