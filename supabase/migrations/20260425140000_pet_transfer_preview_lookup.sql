-- US-PT-006: preview payload for recipient (highlights + record counts) + service-only auth lookups for notifications.

-- Resolve PawBuck user id by login email (Edge notify only; service_role only).
CREATE OR REPLACE FUNCTION public.lookup_auth_user_id_by_email (p_email text)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = auth, public
  AS $$
  SELECT
    u.id
  FROM
    auth.users u
  WHERE
    lower(trim(u.email::text)) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_user_id_by_email (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id_by_email (text) TO service_role;

COMMENT ON FUNCTION public.lookup_auth_user_id_by_email (text) IS
  'Returns auth.users.id for an email; service_role only (pet transfer notifications).';

-- Owner / recipient outbound email address (Edge notify only).
CREATE OR REPLACE FUNCTION public.lookup_auth_email_by_id (p_user_id uuid)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = auth, public
  AS $$
  SELECT
    u.email::text
  FROM
    auth.users u
  WHERE
    u.id = p_user_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_email_by_id (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_auth_email_by_id (uuid) TO service_role;

-- Preview pet transfer for a valid active code (recipient flow; US-PT-006 screen).
CREATE OR REPLACE FUNCTION public.preview_pet_transfer (p_code text)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  t public.pet_transfers%ROWTYPE;
  v_today date := (timezone('utc'::text, now()))::date;
BEGIN
  SELECT
    *
  INTO t
  FROM
    public.pet_transfers
  WHERE
    upper(btrim(code)) = upper(btrim(p_code))
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.pets p
    WHERE
      p.id = t.pet_id
      AND p.deleted_at IS NULL) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'pet',
    (
      SELECT
        jsonb_build_object(
          'name', p.name,
          'breed', p.breed,
          'photo_url', p.photo_url,
          'animal_type', p.animal_type,
          'date_of_birth', p.date_of_birth,
          'email_id', p.email_id
        )
      FROM
        public.pets p
      WHERE
        p.id = t.pet_id
        AND p.deleted_at IS NULL
    ),
    'highlights',
    (
      SELECT
        coalesce(jsonb_agg(h.obj ORDER BY h.ord), '[]'::jsonb)
      FROM (
        SELECT
          u.ord,
          jsonb_build_object(
            'id', j.id,
            'entry_date', j.entry_date,
            'domain', j.domain,
            'subtype', j.subtype,
            'note_preview', left(coalesce(j.note, ''::text), 240)
          ) AS obj
        FROM
          unnest(coalesce(t.journal_highlight_entry_ids, '{}'::uuid[])) WITH ORDINALITY AS u (jid, ord)
          INNER JOIN public.pet_journal_entries j ON j.id = u.jid
            AND j.pet_id = t.pet_id
      ) h
    ),
    'summary',
    jsonb_build_object(
      'vaccination_count', (
        SELECT
          count(*)::int
        FROM
          public.vaccinations v
        WHERE
          v.pet_id = t.pet_id
      ),
      'active_medication_count', (
        SELECT
          count(*)::int
        FROM
          public.medicines m
        WHERE
          m.pet_id = t.pet_id
          AND (m.end_date IS NULL OR m.end_date::date >= v_today)
      ),
      'clinical_exam_count', (
        SELECT
          count(*)::int
        FROM
          public.clinical_exams e
        WHERE
          e.pet_id = t.pet_id
      ),
      'document_count', (
        SELECT
          count(*)::int
        FROM
          public.pet_documents d
        WHERE
          d.pet_id = t.pet_id
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.preview_pet_transfer (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_pet_transfer (text) TO anon;
GRANT EXECUTE ON FUNCTION public.preview_pet_transfer (text) TO authenticated;

COMMENT ON FUNCTION public.preview_pet_transfer (text) IS
  'Returns pet preview, journal highlight snippets, and health record counts for a valid transfer code.';
