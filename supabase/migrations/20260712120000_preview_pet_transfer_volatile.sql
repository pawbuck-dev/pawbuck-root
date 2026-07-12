-- preview_pet_transfer uses SET LOCAL row_security = off (20260511140000) but was still STABLE.
-- PostgreSQL rejects SET in STABLE/IMMUTABLE functions: "SET is not allowed in a non-volatile function".

CREATE OR REPLACE FUNCTION public.preview_pet_transfer (p_code text)
  RETURNS jsonb
  LANGUAGE plpgsql
  VOLATILE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  t public.pet_transfers%ROWTYPE;
  v_today date := (timezone('utc'::text, now()))::date;
BEGIN
  SET LOCAL row_security = off;

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

COMMENT ON FUNCTION public.preview_pet_transfer (text) IS
  'Returns pet preview, journal highlight snippets, and health record counts for a valid transfer code.';
