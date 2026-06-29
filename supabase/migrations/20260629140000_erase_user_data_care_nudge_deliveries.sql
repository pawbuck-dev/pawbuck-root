-- Extend account erasure for care_nudge_deliveries (Phase B).

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

  DELETE FROM public.data_export_requests WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('data_export_requests', n);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO pet_ids
  FROM public.pets
  WHERE user_id = p_user_id;

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

  DELETE FROM public.care_nudge_deliveries WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('care_nudge_deliveries', n);

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

  DELETE FROM public.account_deletion_requests WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  summary := summary || jsonb_build_object('account_deletion_requests', n);

  RETURN summary;
END;
$$;
