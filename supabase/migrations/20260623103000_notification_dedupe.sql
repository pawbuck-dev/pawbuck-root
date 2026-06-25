-- Cooldown ledger for edge push notifications (service role only).
CREATE TABLE IF NOT EXISTS public.notification_dedupe (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS notification_dedupe_sent_at_idx
  ON public.notification_dedupe (sent_at);

ALTER TABLE public.notification_dedupe ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.notification_dedupe IS
  'Prevents duplicate push bursts (e.g. several inbound emails on Free plan). Edge functions use service role.';
