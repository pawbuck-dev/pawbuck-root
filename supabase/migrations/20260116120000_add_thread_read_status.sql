-- Create thread_read_status table to track when each user last read each thread
CREATE TABLE IF NOT EXISTS "public"."thread_read_status" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL REFERENCES "public"."message_threads"("id") ON DELETE CASCADE,
    "last_read_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("user_id", "thread_id")
);

-- Set ownership
ALTER TABLE "public"."thread_read_status" OWNER TO "postgres";

-- Enable Row Level Security
ALTER TABLE "public"."thread_read_status" ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view their own read status
CREATE POLICY "Users can view their own read status"
    ON "public"."thread_read_status"
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS policy: Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
    ON "public"."thread_read_status"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS policy: Users can update their own read status
CREATE POLICY "Users can update their own read status"
    ON "public"."thread_read_status"
    FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS policy: Users can delete their own read status
CREATE POLICY "Users can delete their own read status"
    ON "public"."thread_read_status"
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE "public"."thread_read_status" TO "anon";
GRANT ALL ON TABLE "public"."thread_read_status" TO "authenticated";
GRANT ALL ON TABLE "public"."thread_read_status" TO "service_role";
