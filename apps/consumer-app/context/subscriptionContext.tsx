import PremiumPaywallModal from "@/components/subscription/PremiumPaywallModal";
import { resolveFeatureGateKey } from "@/constants/featureGates";
import { useAuth } from "@/context/authContext";
import { fetchSubscriptionFeatureGates } from "@/services/featureGatesApi";
import { getHasPawbuckProEntitlement } from "@/services/revenuecat";
import { fetchUserEntitlement, isActivePremium } from "@/services/userEntitlements";
import { trackSubscriptionEvent } from "@/utils/subscriptionAnalytics";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppState, AppStateStatus, Platform } from "react-native";
import Purchases from "react-native-purchases";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const DEV_PREMIUM =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_SUBSCRIPTION_DEV_PREMIUM === "true";

type SubscriptionContextValue = {
  /** True when user has active premium via Supabase, RevenueCat "Pawbuck Pro", or dev override. */
  isPremium: boolean;
  isLoading: boolean;
  paywallVisible: boolean;
  openPaywall: (source?: string) => void;
  closePaywall: () => void;
  /** Runs `onAllowed` only if premium (or feature gate is off); otherwise opens paywall and tracks `premium_feature_blocked`. */
  ensurePremium: (onAllowed: () => void, feature?: string) => void;
  refetchEntitlement: () => Promise<void>;
  /** Admin-controlled: false when this feature does not require premium. */
  featureRequiresPremium: (gateKey: string) => boolean;
  /** True when user may use the feature (gate off or has premium). */
  canAccessFeature: (gateKey: string) => boolean;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const apiConfigured = !!getPawbuckApiBaseUrl();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallSource, setPaywallSource] = useState<string | undefined>();

  const { data: entitlement, isLoading: supabaseLoading, refetch: refetchSupabase } = useQuery({
    queryKey: ["user_entitlements", user?.id],
    queryFn: fetchUserEntitlement,
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: revenueCatPro, isLoading: revenueCatLoading } = useQuery({
    queryKey: ["revenuecat_pawbuck_pro", user?.id],
    queryFn: getHasPawbuckProEntitlement,
    enabled: !!user,
    staleTime: 30_000,
  });

  const {
    data: featureGatesMap,
    isLoading: featureGatesLoading,
    isError: featureGatesError,
    error: featureGatesQueryError,
  } = useQuery({
    queryKey: ["subscription_feature_gates", user?.id],
    queryFn: fetchSubscriptionFeatureGates,
    enabled: !!user && apiConfigured,
    /** Admin paywall changes: root QueryClient sets refetchOnMount/focus to false — override here. */
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    /** Matches admin copy (~1 min); keeps long sessions from stale “all premium” gates. */
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const gatesLoading = apiConfigured && !!user && featureGatesLoading;

  const isLoading = !!user && (supabaseLoading || revenueCatLoading || gatesLoading);

  const isPremium = useMemo(() => {
    if (DEV_PREMIUM) return true;
    if (isActivePremium(entitlement ?? undefined)) return true;
    if (revenueCatPro === true) return true;
    return false;
  }, [entitlement, revenueCatPro]);

  const featureRequiresPremium = useCallback(
    (gateKey: string) => {
      if (!apiConfigured) return true;
      if (featureGatesError) return true;
      if (featureGatesMap === undefined) return true;
      return featureGatesMap[gateKey] ?? true;
    },
    [apiConfigured, featureGatesError, featureGatesMap]
  );

  const canAccessFeature = useCallback(
    (gateKey: string) => {
      if (!featureRequiresPremium(gateKey)) return true;
      return isPremium;
    },
    [featureRequiresPremium, isPremium]
  );

  const refetchEntitlement = useCallback(async () => {
    await refetchSupabase();
    await queryClient.invalidateQueries({ queryKey: ["user_entitlements"] });
    await queryClient.invalidateQueries({ queryKey: ["revenuecat_pawbuck_pro"] });
    await queryClient.invalidateQueries({ queryKey: ["subscription_feature_gates"] });
  }, [queryClient, refetchSupabase]);

  const openPaywall = useCallback((source?: string) => {
    setPaywallSource(source);
    setPaywallVisible(true);
    void trackSubscriptionEvent("paywall_impression", { source: source ?? "unknown" });
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
    setPaywallSource(undefined);
  }, []);

  const ensurePremium = useCallback(
    (onAllowed: () => void, feature?: string) => {
      if (isLoading) return;
      const gateKey = resolveFeatureGateKey(feature);
      if (gateKey && !featureRequiresPremium(gateKey)) {
        onAllowed();
        return;
      }
      if (isPremium) {
        onAllowed();
        return;
      }
      void trackSubscriptionEvent("premium_feature_blocked", { feature: feature ?? "unknown" });
      openPaywall(feature);
    },
    [isLoading, featureRequiresPremium, isPremium, openPaywall]
  );

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["user_entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["revenuecat_pawbuck_pro"] });
      queryClient.invalidateQueries({ queryKey: ["subscription_feature_gates"] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  /** React Query “window focus” is unreliable on RN; refresh gates when app returns to foreground. */
  React.useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active" && user && apiConfigured) {
        void queryClient.invalidateQueries({ queryKey: ["subscription_feature_gates"] });
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [queryClient, user, apiConfigured]);

  React.useEffect(() => {
    if (!__DEV__ || !featureGatesError) return;
    const msg =
      featureGatesQueryError instanceof Error
        ? featureGatesQueryError.message
        : String(featureGatesQueryError);
    console.warn(
      "[subscription] Feature gates failed to load — all areas treat as premium until this succeeds.",
      msg,
      "If testing on a physical device, EXPO_PUBLIC_PAWBUCK_API_URL cannot be http://127.0.0.1 — use your Mac LAN IP or the deployed API URL."
    );
  }, [featureGatesError, featureGatesQueryError]);

  React.useEffect(() => {
    if (Platform.OS === "web") return;
    const onUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["revenuecat_pawbuck_pro"] });
    };
    Purchases.addCustomerInfoUpdateListener(onUpdate);
  }, [queryClient]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPremium,
      isLoading,
      paywallVisible,
      openPaywall,
      closePaywall,
      ensurePremium,
      refetchEntitlement,
      featureRequiresPremium,
      canAccessFeature,
    }),
    [
      isPremium,
      isLoading,
      paywallVisible,
      openPaywall,
      closePaywall,
      ensurePremium,
      refetchEntitlement,
      featureRequiresPremium,
      canAccessFeature,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <PremiumPaywallModal
        visible={paywallVisible}
        onClose={closePaywall}
        source={paywallSource}
        refetchEntitlement={refetchEntitlement}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
