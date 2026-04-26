-- Pet transfer v1.5: journal highlights & exclusions, recipient hint, prior-owner snapshot,
-- pet parent display name, care-team reset on accept, transfer highlight persistence.

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS pet_parent_display_name text;

COMMENT ON COLUMN public.pets.pet_parent_display_name IS
  'Display name for “pet parent”; set during transfer acceptance; optional elsewhere.';

ALTER TABLE public.pet_transfers
  ADD COLUMN IF NOT EXISTS recipient_contact text,
  ADD COLUMN IF NOT EXISTS prior_owner_show_name boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS journal_highlight_entry_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS excluded_journal_entry_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS prior_owner_display_snapshot text;

COMMENT ON COLUMN public.pet_transfers.recipient_contact IS
  'Optional owner-entered hint: recipient email or @username (informational; transfer still uses code).';
COMMENT ON COLUMN public.pet_transfers.prior_owner_show_name IS
  'When true, prior owner display name is snapshotted into prior_owner_display_snapshot on accept.';
COMMENT ON COLUMN public.pet_transfers.journal_highlight_entry_ids IS
  'Up to 5 pet_journal_entries ids to surface to the new owner after transfer.';
COMMENT ON COLUMN public.pet_transfers.excluded_journal_entry_ids IS
  'Journal entries to remove on accept; vet_flagged entries cannot be listed (enforced by trigger).';
COMMENT ON COLUMN public.pet_transfers.prior_owner_display_snapshot IS
  'Immutable-friendly snapshot of prior owner name at accept time (null if they opted out).';

ALTER TABLE public.pet_transfers
  DROP CONSTRAINT IF EXISTS pet_transfers_journal_highlight_max;

ALTER TABLE public.pet_transfers
  ADD CONSTRAINT pet_transfers_journal_highlight_max
  CHECK (coalesce(cardinality(journal_highlight_entry_ids), 0) <= 5);

-- ---------------------------------------------------------------------------
-- Pinned journal highlights for the new owner (view layer; entries stay in journal)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pet_journal_transfer_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.pet_journal_entries (id) ON DELETE CASCADE,
  sort_order smallint NOT NULL CHECK (sort_order >= 1 AND sort_order <= 5),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT pet_journal_transfer_highlights_pet_entry_key UNIQUE (pet_id, journal_entry_id),
  CONSTRAINT pet_journal_transfer_highlights_pet_sort_key UNIQUE (pet_id, sort_order)
);

COMMENT ON TABLE public.pet_journal_transfer_highlights IS
  'Journal entries highlighted by the previous owner at transfer time (US-PT-003).';

CREATE INDEX IF NOT EXISTS pet_journal_transfer_highlights_pet_idx
  ON public.pet_journal_transfer_highlights (pet_id, sort_order);

ALTER TABLE public.pet_journal_transfer_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_journal_transfer_highlights_select" ON public.pet_journal_transfer_highlights;
CREATE POLICY "pet_journal_transfer_highlights_select"
  ON public.pet_journal_transfer_highlights
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_pet (pet_id));

GRANT SELECT ON TABLE public.pet_journal_transfer_highlights TO authenticated;
GRANT ALL ON TABLE public.pet_journal_transfer_highlights TO service_role;

-- ---------------------------------------------------------------------------
-- Validate journal arrays on pet_transfers insert/update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_pet_transfer_journal_refs ()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  hid uuid;
BEGIN
  IF coalesce(cardinality(NEW.journal_highlight_entry_ids), 0) > 5 THEN
    RAISE EXCEPTION 'At most 5 journal highlights are allowed';
  END IF;

  FOREACH hid IN ARRAY coalesce(NEW.journal_highlight_entry_ids, '{}'::uuid[])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.pet_journal_entries j
      WHERE j.id = hid
        AND j.pet_id = NEW.pet_id
    ) THEN
      RAISE EXCEPTION 'Invalid journal highlight entry %', hid;
    END IF;
  END LOOP;

  FOREACH hid IN ARRAY coalesce(NEW.excluded_journal_entry_ids, '{}'::uuid[])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.pet_journal_entries j
      WHERE j.id = hid
        AND j.pet_id = NEW.pet_id
    ) THEN
      RAISE EXCEPTION 'Invalid excluded journal entry %', hid;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.pet_journal_entries j
      WHERE j.id = hid
        AND j.pet_id = NEW.pet_id
        AND coalesce(j.vet_flagged, false)
    ) THEN
      RAISE EXCEPTION 'Vet-flagged journal entries cannot be excluded from transfer';
    END IF;
  END LOOP;

  IF EXISTS (
      SELECT 1
      FROM unnest(coalesce(NEW.journal_highlight_entry_ids, '{}'::uuid[])) h (id)
        INNER JOIN unnest(coalesce(NEW.excluded_journal_entry_ids, '{}'::uuid[])) e (id) ON e.id = h.id
    ) THEN
    RAISE EXCEPTION 'A journal entry cannot be both highlighted and excluded';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_pet_transfer_journal_refs ON public.pet_transfers;
CREATE TRIGGER trg_validate_pet_transfer_journal_refs
  BEFORE INSERT OR UPDATE OF journal_highlight_entry_ids, excluded_journal_entry_ids, pet_id ON public.pet_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pet_transfer_journal_refs ();

-- ---------------------------------------------------------------------------
-- Current pet owner can read completed transfer rows (transfer history)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "pet_transfers_select_pet_owner" ON public.pet_transfers;
CREATE POLICY "pet_transfers_select_pet_owner"
  ON public.pet_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pets p
      WHERE p.id = pet_transfers.pet_id
        AND p.user_id = auth.uid ()
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- accept_pet_transfer: optional pet parent name + post-transfer cleanup
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.accept_pet_transfer (text);

CREATE OR REPLACE FUNCTION public.accept_pet_transfer (
  p_code text,
  p_pet_parent_display_name text DEFAULT NULL
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  t public.pet_transfers%ROWTYPE;
  v_pet uuid;
  v_prior_snap text;
  v_highlight_len int;
  i int;
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO t
  FROM public.pet_transfers
  WHERE upper(btrim(code)) = upper(btrim(p_code))
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now ());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired transfer code';
  END IF;

  IF t.from_user_id = auth.uid () THEN
    RAISE EXCEPTION 'You cannot transfer a pet to yourself';
  END IF;

  SELECT up.full_name
  INTO v_prior_snap
  FROM public.user_preferences up
  WHERE up.user_id = t.from_user_id
  LIMIT 1;

  UPDATE public.pets p
  SET
    user_id = auth.uid (),
    pet_parent_display_name = CASE WHEN p_pet_parent_display_name IS NOT NULL
      AND btrim(p_pet_parent_display_name) <> '' THEN
      btrim(p_pet_parent_display_name)
    ELSE
      p.pet_parent_display_name
    END
  WHERE
    p.id = t.pet_id
    AND p.user_id = t.from_user_id
  RETURNING
    p.id INTO v_pet;

  IF v_pet IS NULL THEN
    RAISE EXCEPTION 'Pet not found or ownership changed; transfer could not complete';
  END IF;

  UPDATE public.pet_transfers
  SET
    used_at = now (),
    to_user_id = auth.uid (),
    is_active = false,
    prior_owner_display_snapshot = CASE WHEN t.prior_owner_show_name THEN
      v_prior_snap
    ELSE
      NULL
    END
  WHERE
    id = t.id;

  DELETE FROM public.pet_care_team_members c
  WHERE c.pet_id = t.pet_id;

  DELETE FROM public.pet_journal_entries j
  WHERE j.pet_id = t.pet_id
    AND j.id = ANY (t.excluded_journal_entry_ids)
    AND NOT coalesce(j.vet_flagged, false);

  DELETE FROM public.pet_journal_transfer_highlights h
  WHERE h.pet_id = t.pet_id;

  v_highlight_len := coalesce(array_length(t.journal_highlight_entry_ids, 1), 0);

  IF v_highlight_len > 0 THEN
    FOR i IN 1..v_highlight_len LOOP
      INSERT INTO public.pet_journal_transfer_highlights (pet_id, journal_entry_id, sort_order)
        VALUES (t.pet_id, t.journal_highlight_entry_ids[i], i::smallint);
    END LOOP;
  END IF;

  RETURN v_pet;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_pet_transfer (text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_pet_transfer (text, text) TO authenticated;

-- Keep single-argument calls working (default second param)
COMMENT ON FUNCTION public.accept_pet_transfer (text, text) IS
  'Completes pet ownership transfer; optional pet parent display name for the new owner.';
