-- Change weight column from integer to numeric to support decimal values
ALTER TABLE "public"."pets" ALTER COLUMN "weight_value" TYPE numeric USING "weight_value"::numeric;

