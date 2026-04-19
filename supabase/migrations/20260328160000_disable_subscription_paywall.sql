-- Disable paywall at the database layer: no feature keys require premium.
-- Mobile and PawBuck.API read `subscription_feature_gates` for `canAccessFeature` / `IsPremiumRequiredForFeatureAsync`.
-- Note: API `Subscription:RequirePremiumForMilo` (and similar app settings) can still enforce premium independently; set those to false in deployment if you want Milo unlocked without premium rows.

UPDATE public.subscription_feature_gates
SET
  requires_premium = false,
  updated_at = timezone('utc', now());

-- Treat existing subscribers as premium in `user_entitlements` so code paths that check `plan` only still allow access.
UPDATE public.user_entitlements
SET
  plan = 'premium',
  updated_at = timezone('utc', now())
WHERE plan = 'free';

COMMENT ON TABLE public.subscription_feature_gates IS 'Admin-controlled: when requires_premium is true, the feature is gated behind PawBuck Premium. All rows set to false by migration 20260328160000_disable_subscription_paywall (paywall off at DB).';
