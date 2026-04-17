import PremiumPaywallModal from "@/components/subscription/PremiumPaywallModal";
import { useAuth } from "@/context/authContext";
import { getHasPawbuckProEntitlement } from "@/services/revenuecat";
import { fetchUserEntitlement, isActivePremium } from "@/services/userEntitlements";
import { trackSubscriptionEvent } from "@/utils/subscriptionAnalytics";
import { supabase } from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
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
  /** Runs `onAllowed` only if premium; otherwise opens paywall and tracks `premium_feature_blocked`. */
  ensurePremium: (onAllowed: () => void, feature?: string) => void;
  refetchEntitlement: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  const isLoading = !!user && (supabaseLoading || revenueCatLoading);

  const isPremium = useMemo(() => {
    if (DEV_PREMIUM) return true;
    if (isActivePremium(entitlement ?? undefined)) return true;
    if (revenueCatPro === true) return true;
    return false;
  }, [entitlement, revenueCatPro]);

  const refetchEntitlement = useCallback(async () => {
    await refetchSupabase();
    await queryClient.invalidateQueries({ queryKey: ["user_entitlements"] });
    await queryClient.invalidateQueries({ queryKey: ["revenuecat_pawbuck_pro"] });
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
      if (isPremium) {
        onAllowed();
        return;
      }
      void trackSubscriptionEvent("premium_feature_blocked", { feature: feature ?? "unknown" });
      openPaywall(feature);
    },
    [isLoading, isPremium, openPaywall]
  );

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["user_entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["revenuecat_pawbuck_pro"] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

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
    }),
    [isPremium, isLoading, paywallVisible, openPaywall, closePaywall, ensurePremium, refetchEntitlement]
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
