-- Account deletion grace window, audit log, and deterministic user erasure RPC.
-- PawBuck.API AccountPurgeWorker calls erase_user_data after purge_after.

-- ---------------------------------------------------------------------------
-- Deletion request queue (7-day grace)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  purge_after timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'purged', 'cancelled')),
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_pending_per_user
  ON public.account_deletion_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS account_deletion_requests_purge_idx
  ON public.account_deletion_requests (status, purge_after)
  WHERE status = 'pending';

COMMENT ON TABLE public.account_deletion_requests IS
  'User-initiated account deletion: pending until purge_after, then hard delete via API worker.';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can read/cancel their own pending request; inserts via Edge (service role).
CREATE POLICY "account_deletion_requests_select_own"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "account_deletion_requests_update_cancel_own"
  ON public.account_deletion_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

GRANT SELECT, UPDATE ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

-- ---------------------------------------------------------------------------
-- Purge audit log (hashed user id — no PII)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  rows_summary jsonb,
  error_message text
);

CREATE INDEX IF NOT EXISTS account_deletion_log_completed_idx
  ON public.account_deletion_log (completed_at DESC);

COMMENT ON TABLE public.account_deletion_log IS
  'Audit trail after account purge (SHA-256 of user_id, row counts from erase_user_data).';

ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;
-- No client access; service role / support API only.
GRANT ALL ON public.account_deletion_log TO service_role;

-- ---------------------------------------------------------------------------
-- Schedule / cancel / status (authenticated + service role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_deletion_status(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('scheduled', false);
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_uid AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row
  FROM public.account_deletion_requests
  WHERE user_id = v_uid AND status = 'pending'
  ORDER BY requested_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('scheduled', false);
  END IF;

  RETURN jsonb_build_object(
    'scheduled', true,
    'requested_at', v_row.requested_at,
    'purge_after', v_row.purge_after,
    'request_id', v_row.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_account_deletion(
  p_user_id uuid,
  p_grace_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grace integer := GREATEST(1, LEAST(COALESCE(p_grace_days, 7), 30));
  v_purge timestamptz := timezone('utc', now()) + (v_grace || ' days')::interval;
  v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  UPDATE public.account_deletion_requests
  SET status = 'cancelled', cancelled_at = timezone('utc', now()), updated_at = timezone('utc', now())
  WHERE user_id = p_user_id AND status = 'pending';

  INSERT INTO public.account_deletion_requests (user_id, purge_after, status)
  VALUES (p_user_id, v_purge, 'pending')
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'scheduled', true,
    'request_id', v_row.id,
    'purge_after', v_row.purge_after,
    'grace_days', v_grace
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_n integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_uid AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.account_deletion_requests
  SET status = 'cancelled', cancelled_at = timezone('utc', now()), updated_at = timezone('utc', now())
  WHERE user_id = v_uid AND status = 'pending';

  GET DIAGNOSTICS v_n = ROW_COUNT;

  RETURN jsonb_build_object('cancelled', v_n > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_deletion_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.schedule_account_deletion(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Deterministic erasure (service role only; single transaction)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erase_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pet_ids uuid[];
  thread_ids uuid[];
  n bigint;
  summary jsonb := '{}'::jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO pet_ids
  FROM public.pets
  WHERE user_id = p_user_id;

  -- Milo journal feedback → turns
  DELETE FROM public.milo_journal_message_feedback f
  USING public.milo_journal_chat_turns t
  WHERE f.turn_id = t.id
    AND (t.user_id = p_user_id OR t.pet_id = ANY (pet_ids));
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('milo_journal_message_feedback', n);

  DELETE FROM public.milo_journal_chat_turns
  WHERE user_id = p_user_id OR pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('milo_journal_chat_turns', n);

  DELETE FROM public.journal_interview_sessions
  WHERE user_id = p_user_id OR pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('journal_interview_sessions', n);

  DELETE FROM public.thread_read_status WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('thread_read_status', n);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO thread_ids
  FROM public.message_threads
  WHERE pet_id = ANY (pet_ids);

  IF array_length(thread_ids, 1) IS NOT NULL THEN
    DELETE FROM public.thread_messages WHERE thread_id = ANY (thread_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    summary := summary || jsonb_build_object('thread_messages', n);
  END IF;

  DELETE FROM public.message_threads WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('message_threads', n);

  DELETE FROM public.pending_email_approvals WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pending_email_approvals', n);

  DELETE FROM public.processed_emails WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('processed_emails', n);

  DELETE FROM public.pet_email_list WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_email_list', n);

  DELETE FROM public.pet_care_team_members WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_care_team_members', n);

  DELETE FROM public.medication_doses WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('medication_doses', n);

  DELETE FROM public.medicines WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('medicines', n);

  DELETE FROM public.vaccinations WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('vaccinations', n);

  DELETE FROM public.clinical_exams WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('clinical_exams', n);

  DELETE FROM public.lab_results WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('lab_results', n);

  DELETE FROM public.pet_documents WHERE user_id = p_user_id OR pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_documents', n);

  DELETE FROM public.walk_sessions WHERE user_id = p_user_id OR pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('walk_sessions', n);

  DELETE FROM public.daily_intake WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('daily_intake', n);

  DELETE FROM public.pet_weight_logs WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_weight_logs', n);

  DELETE FROM public.pet_behavior_baselines WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_behavior_baselines', n);

  DELETE FROM public.pet_journal_entries WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_journal_entries', n);

  DELETE FROM public.pet_allergies WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_allergies', n);

  DELETE FROM public.pet_conditions WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_conditions', n);

  DELETE FROM public.pet_journal_transfer_highlights WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_journal_transfer_highlights', n);

  DELETE FROM public.pet_activity_events WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_activity_events', n);

  DELETE FROM public.pet_family_notification_prefs WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_family_notification_prefs', n);

  DELETE FROM public.pet_family_invites WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_family_invites', n);

  DELETE FROM public.pet_family_grants
  WHERE pet_id = ANY (pet_ids) OR grantee_id = p_user_id OR invited_by = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_family_grants', n);

  DELETE FROM public.proactive_pet_health_sends WHERE pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('proactive_pet_health_sends', n);

  DELETE FROM public.vet_booking_reminder_sent v
  USING public.vet_bookings b
  WHERE v.vet_booking_id = b.id
    AND (b.pet_id = ANY (pet_ids) OR b.user_id = p_user_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('vet_booking_reminder_sent', n);

  DELETE FROM public.document_expiry_reminder_sent d
  USING public.pet_documents pd
  WHERE d.pet_document_id = pd.id
    AND (pd.pet_id = ANY (pet_ids) OR pd.user_id = p_user_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('document_expiry_reminder_sent', n);

  DELETE FROM public.vet_bookings WHERE user_id = p_user_id OR pet_id = ANY (pet_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('vet_bookings', n);

  DELETE FROM public.marketplace_service_bookings b
  USING public.provider_profiles pp
  WHERE b.provider_profile_id = pp.id AND pp.user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('marketplace_service_bookings', n);

  DELETE FROM public.service_areas sa
  USING public.provider_profiles pp
  WHERE sa.provider_profile_id = pp.id AND pp.user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('service_areas', n);

  DELETE FROM public.service_offerings so
  USING public.provider_profiles pp
  WHERE so.provider_profile_id = pp.id AND pp.user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('service_offerings', n);

  DELETE FROM public.provider_profiles WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('provider_profiles', n);

  DELETE FROM public.pet_transfers
  WHERE pet_id = ANY (pet_ids)
     OR from_user_id = p_user_id
     OR to_user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pet_transfers', n);

  DELETE FROM public.founding_member_purchases WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('founding_member_purchases', n);

  DELETE FROM public.analytics_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('analytics_events', n);

  DELETE FROM public.user_entitlements WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('user_entitlements', n);

  DELETE FROM public.user_subscription_usage WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('user_subscription_usage', n);

  DELETE FROM public.household_members
  WHERE user_id = p_user_id OR household_owner_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('household_members', n);

  DELETE FROM public.household_invites WHERE created_by = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('household_invites', n);

  DELETE FROM public.push_tokens WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('push_tokens', n);

  DELETE FROM public.user_preferences WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('user_preferences', n);

  DELETE FROM public.pets WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('pets', n);

  -- Pending deletion row removed last (worker marks purged separately)
  DELETE FROM public.account_deletion_requests WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('account_deletion_requests', n);

  RETURN summary;
END;
$$;

REVOKE ALL ON FUNCTION public.erase_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erase_user_data(uuid) TO service_role;

COMMENT ON FUNCTION public.erase_user_data IS
  'Transactional hard delete of all user-scoped Postgres rows. Storage + auth.users handled by PawBuck.API purge worker.';
