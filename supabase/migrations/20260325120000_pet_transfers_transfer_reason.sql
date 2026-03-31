-- Optional reason captured when owner starts a pet transfer (Figma transfer flow).
ALTER TABLE public.pet_transfers
  ADD COLUMN IF NOT EXISTS transfer_reason text;

COMMENT ON COLUMN public.pet_transfers.transfer_reason IS
  'Owner-selected reason: rehoming, family_transfer, rescue_adoption, other';
