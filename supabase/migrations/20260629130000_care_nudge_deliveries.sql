-- Proactive care nudge delivery dedupe (Phase B).

CREATE TABLE IF NOT EXISTS public.care_nudge_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets (id) ON DELETE SET NULL,
  nudge_kind text,
  dedupe_key text NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['push'::text, 'local'::text, 'in_app'::text])),
  sent_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, dedupe_key, channel)
);

CREATE INDEX IF NOT EXISTS care_nudge_deliveries_user_sent_idx
  ON public.care_nudge_deliveries (user_id, sent_at DESC);

ALTER TABLE public.care_nudge_deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.care_nudge_deliveries IS 'Dedupe log for proactive care nudges (push/local/in_app).';

REVOKE ALL ON TABLE public.care_nudge_deliveries FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.care_nudge_deliveries TO service_role;
GRANT SELECT, INSERT ON TABLE public.care_nudge_deliveries TO postgres;

-- Extend account erasure (additive patch via CREATE OR REPLACE on erase function body is heavy;
-- append delete in a follow-up migration pattern: standalone delete for ops + document in plan).
CREATE OR REPLACE FUNCTION public.delete_care_nudge_deliveries_for_user(p_user_id uuid) RETURNS integer
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO public
  AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.care_nudge_deliveries WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_care_nudge_deliveries_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_care_nudge_deliveries_for_user(uuid) TO service_role;
