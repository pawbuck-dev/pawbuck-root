import type { FeatureGateKey } from "@/constants/featureGates";
import { useSubscription } from "@/context/subscriptionContext";
import { useMemo } from "react";

/** Combines admin feature gates with premium status for a canonical gate key. */
export function useFeatureGate(featureKey: FeatureGateKey) {
  const { canAccessFeature, isLoading } = useSubscription();
  const canAccess = useMemo(() => canAccessFeature(featureKey), [canAccessFeature, featureKey]);
  return {
    canAccess,
    loading: isLoading,
  };
}
