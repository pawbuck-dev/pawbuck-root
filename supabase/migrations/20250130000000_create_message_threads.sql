-- Create message threads table
CREATE TABLE IF NOT EXISTS "public"."message_threads" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pet_id" uuid NOT NULL REFERENCES "public"."pets"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "recipient_email" text NOT NULL,
  "recipient_name" text,
  "reply_to_address" text NOT NULL UNIQUE,
  "subject" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "idx_message_threads_pet_id" ON "public"."message_threads"("pet_id");
CREATE INDEX "idx_message_threads_user_id" ON "public"."message_threads"("user_id");
CREATE INDEX "idx_message_threads_reply_to_address" ON "public"."message_threads"("reply_to_address");

-- Create thread messages table
CREATE TABLE IF NOT EXISTS "public"."thread_messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL REFERENCES "public"."message_threads"("id") ON DELETE CASCADE,
  "direction" text NOT NULL CHECK ("direction" IN ('outbound', 'inbound')),
  "sender_email" text NOT NULL,
  "recipient_email" text NOT NULL,
  "cc" text[],
  "bcc" text[],
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "sent_at" timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "idx_thread_messages_thread_id" ON "public"."thread_messages"("thread_id");
CREATE INDEX "idx_thread_messages_sent_at" ON "public"."thread_messages"("sent_at");

-- Enable RLS
ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."thread_messages" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_threads
CREATE POLICY "Users can view their own message threads"
  ON "public"."message_threads"
  FOR SELECT
  USING (auth.uid() = "user_id");

CREATE POLICY "Users can create their own message threads"
  ON "public"."message_threads"
  FOR INSERT
  WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can update their own message threads"
  ON "public"."message_threads"
  FOR UPDATE
  USING (auth.uid() = "user_id");

-- RLS Policies for thread_messages
CREATE POLICY "Users can view messages in their threads"
  ON "public"."thread_messages"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."message_threads"
      WHERE "message_threads"."id" = "thread_messages"."thread_id"
      AND "message_threads"."user_id" = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their threads"
  ON "public"."thread_messages"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."message_threads"
      WHERE "message_threads"."id" = "thread_messages"."thread_id"
      AND "message_threads"."user_id" = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_thread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON "public"."message_threads"
  FOR EACH ROW
  EXECUTE FUNCTION update_message_thread_updated_at();

