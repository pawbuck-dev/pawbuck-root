-- Recipient can decline an active transfer (RLS only allows from_user_id to UPDATE).
ALTER TABLE public.pet_transfers
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pet_transfers.declined_at IS
  'Set when recipient declines; row is deactivated (is_active = false).';
COMMENT ON COLUMN public.pet_transfers.declined_by_user_id IS
  'Authenticated user who declined (must not be from_user_id).';

CREATE OR REPLACE FUNCTION public.decline_pet_transfer(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  UPDATE public.pet_transfers t
  SET
    is_active = false,
    declined_at = now(),
    declined_by_user_id = auth.uid()
  WHERE upper(btrim(t.code)) = upper(btrim(p_code))
    AND t.is_active = true
    AND t.used_at IS NULL
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND t.from_user_id IS DISTINCT FROM auth.uid()
  RETURNING t.id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or ineligible transfer code';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_pet_transfer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_pet_transfer(text) TO authenticated;

-- Recipient cannot UPDATE pet_transfers under existing RLS (only from_user_id). Accept via SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.accept_pet_transfer(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.pet_transfers%ROWTYPE;
  v_pet uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  SELECT * INTO t
  FROM public.pet_transfers
  WHERE upper(btrim(code)) = upper(btrim(p_code))
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired transfer code';
  END IF;

  IF t.from_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot transfer a pet to yourself';
  END IF;

  UPDATE public.pet_transfers
  SET
    used_at = now(),
    to_user_id = auth.uid(),
    is_active = false
  WHERE id = t.id;

  UPDATE public.pets p
  SET user_id = auth.uid()
  WHERE p.id = t.pet_id
    AND p.user_id = t.from_user_id
  RETURNING p.id INTO v_pet;

  IF v_pet IS NULL THEN
    UPDATE public.pet_transfers
    SET
      used_at = null,
      to_user_id = null,
      is_active = true
    WHERE id = t.id;
    RAISE EXCEPTION 'Pet not found or ownership changed; transfer could not complete';
  END IF;

  RETURN v_pet;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_pet_transfer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_pet_transfer(text) TO authenticated;
