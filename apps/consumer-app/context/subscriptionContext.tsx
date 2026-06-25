import PremiumPaywallModal from "@/components/subscription/PremiumPaywallModal";
import { resolveFeatureGateKey } from "@/constants/featureGates";
import {
  meetsMinimumPlan,
  normalizePlan,
  PAYWALL_COPY,
  resolveEffectiveSubscriptionPlan,
  type OpenPaywallOptions,
  type SubscriptionPlan,
} from "@/constants/subscriptionPlans";
import { useAuth } from "@/context/authContext";
import { fetchSubscriptionFeatureGates } from "@/services/featureGatesApi";
import { getRevenueCatPlan } from "@/services/revenuecat";
import { fetchSubscriptionStatus, type SubscriptionStatus } from "@/services/subscriptionStatusApi";
import {
  fetchUserEntitlement,
  getActivePlanFromRow,
  isActivePremium,
  isFoundingMember,
} from "@/services/userEntitlements";
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

const DEV_PREMIUM_PLAN: SubscriptionPlan =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_SUBSCRIPTION_DEV_PREMIUM === "true"
    ? "family"
    : "free";

type SubscriptionContextValue = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus | null | undefined;
  isFoundingMember: boolean;
  /** True when plan is individual or family. */
  isPremium: boolean;
  isLoading: boolean;
  paywallVisible: boolean;
  paywallOptions: OpenPaywallOptions;
  openPaywall: (options?: OpenPaywallOptions | string) => void;
  closePaywall: () => void;
  isAtLeast: (minimum: SubscriptionPlan) => boolean;
  ensurePlan: (minimumPlan: SubscriptionPlan, onAllowed: () => void, feature?: string) => void;
  ensurePremium: (onAllowed: () => void, feature?: string) => void;
  refetchEntitlement: () => Promise<void>;
  featureRequiresPremium: (gateKey: string) => boolean;
  minimumPlanForFeature: (gateKey: string) => SubscriptionPlan;
  canAccessFeature: (gateKey: string) => boolean;
  miloConversationsRemaining: number | null;
  aiJournalEntriesRemaining: number | null;
  canStartAiJournal: boolean;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const apiConfigured = !!getPawbuckApiBaseUrl();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallOptions, setPaywallOptions] = useState<OpenPaywallOptions>({});

  const { data: entitlement, isLoading: supabaseLoading, refetch: refetchSupabase } = useQuery({
    queryKey: ["user_entitlements", user?.id],
    queryFn: fetchUserEntitlement,
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: revenueCatPlan, isLoading: revenueCatLoading } = useQuery({
    queryKey: ["revenuecat_plan", user?.id],
    queryFn: getRevenueCatPlan,
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: subscriptionStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["subscription_status", user?.id],
    queryFn: fetchSubscriptionStatus,
    enabled: !!user && apiConfigured,
    staleTime: 30_000,
    retry: 1,
  });

  const {
    data: featureGates,
    isLoading: featureGatesLoading,
    isError: featureGatesError,
    error: featureGatesQueryError,
  } = useQuery({
    queryKey: ["subscription_feature_gates", user?.id],
    queryFn: fetchSubscriptionFeatureGates,
    enabled: !!user && apiConfigured,
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const gatesLoading = apiConfigured && !!user && featureGatesLoading;
  const isLoading = !!user && (supabaseLoading || revenueCatLoading || statusLoading || gatesLoading);

  const plan = useMemo((): SubscriptionPlan => {
    if (DEV_PREMIUM_PLAN !== "free") return DEV_PREMIUM_PLAN;
    return resolveEffectiveSubscriptionPlan([
      getActivePlanFromRow(entitlement ?? undefined),
      subscriptionStatus?.activePlan,
      subscriptionStatus?.plan,
      revenueCatPlan,
    ]);
  }, [entitlement, revenueCatPlan, subscriptionStatus?.activePlan, subscriptionStatus?.plan]);

  const isPremium = plan === "individual" || plan === "family";
  const founding = subscriptionStatus?.isFoundingMember ?? isFoundingMember(entitlement ?? undefined);

  const minimumPlanForFeature = useCallback(
    (gateKey: string): SubscriptionPlan => {
      if (featureGatesError) return "free";
      if (!apiConfigured || !featureGates) return "individual";
      return featureGates.minimumPlan[gateKey] ?? "individual";
    },
    [apiConfigured, featureGates, featureGatesError]
  );

  const featureRequiresPremium = useCallback(
    (gateKey: string) => {
      const min = minimumPlanForFeature(gateKey);
      return min !== "free";
    },
    [minimumPlanForFeature]
  );

  const isAtLeast = useCallback(
    (minimum: SubscriptionPlan) => meetsMinimumPlan(plan, minimum),
    [plan]
  );

  const canAccessFeature = useCallback(
    (gateKey: string) => isAtLeast(minimumPlanForFeature(gateKey)),
    [isAtLeast, minimumPlanForFeature]
  );

  const miloConversationsRemaining = useMemo(() => {
    if (isAtLeast("individual")) return null;
    const max = subscriptionStatus?.limits.maxMiloConversations ?? 3;
    const used = subscriptionStatus?.usage.miloConversationsUsed ?? 0;
    return Math.max(0, max - used);
  }, [isAtLeast, subscriptionStatus]);

  const aiJournalEntriesRemaining = useMemo(() => {
    if (isAtLeast("individual")) return null;
    const max = subscriptionStatus?.limits.maxAiJournalEntries ?? 2;
    const used = subscriptionStatus?.usage.aiJournalEntriesUsed ?? 0;
    return Math.max(0, max - used);
  }, [isAtLeast, subscriptionStatus]);

  const canStartAiJournal =
    aiJournalEntriesRemaining === null || aiJournalEntriesRemaining > 0;

  const refetchEntitlement = useCallback(async () => {
    await refetchSupabase();
    await refetchStatus();
    await queryClient.invalidateQueries({ queryKey: ["user_entitlements"] });
    await queryClient.invalidateQueries({ queryKey: ["revenuecat_plan"] });
    await queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
    await queryClient.invalidateQueries({ queryKey: ["subscription_feature_gates"] });
  }, [queryClient, refetchStatus, refetchSupabase]);

  const openPaywall = useCallback((options?: OpenPaywallOptions | string) => {
    const opts: OpenPaywallOptions =
      typeof options === "string" ? { source: options } : (options ?? {});
    setPaywallOptions(opts);
    setPaywallVisible(true);
    void trackSubscriptionEvent("paywall_impression", {
      source: opts.source ?? "unknown",
      target_plan: opts.requiredPlan ?? opts.copyVariant ?? "individual",
      current_plan: plan,
    });
  }, [plan]);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
    setPaywallOptions({});
  }, []);

  const ensurePlan = useCallback(
    (minimumPlan: SubscriptionPlan, onAllowed: () => void, feature?: string) => {
      if (isLoading) return;
      const gateKey = resolveFeatureGateKey(feature);
      if (gateKey && canAccessFeature(gateKey)) {
        onAllowed();
        return;
      }
      if (isAtLeast(minimumPlan)) {
        onAllowed();
        return;
      }
      void trackSubscriptionEvent("premium_feature_blocked", {
        feature: feature ?? "unknown",
        target_plan: minimumPlan,
        current_plan: plan,
      });
      openPaywall({ source: feature, requiredPlan: minimumPlan });
    },
    [canAccessFeature, isAtLeast, isLoading, openPaywall, plan]
  );

  const ensurePremium = useCallback(
    (onAllowed: () => void, feature?: string) => {
      ensurePlan("individual", onAllowed, feature);
    },
    [ensurePlan]
  );

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queueMicrotask(() => {
        queryClient.invalidateQueries({ queryKey: ["user_entitlements"] });
        queryClient.invalidateQueries({ queryKey: ["revenuecat_plan"] });
        queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
        queryClient.invalidateQueries({ queryKey: ["subscription_feature_gates"] });
      });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  React.useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active" && user && apiConfigured) {
        queueMicrotask(() => {
          void queryClient.invalidateQueries({ queryKey: ["subscription_feature_gates"] });
          void queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
        });
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [queryClient, user, apiConfigured]);

  React.useEffect(() => {
    if (!featureGatesError) return;
    const msg =
      featureGatesQueryError instanceof Error
        ? featureGatesQueryError.message
        : String(featureGatesQueryError);
    if (__DEV__) {
      console.warn("[subscription] Feature gates failed to load", msg);
    }
    void trackSubscriptionEvent("subscription_gates_degraded", {
      reason: msg.slice(0, 200),
      current_plan: plan,
    });
  }, [featureGatesError, featureGatesQueryError, plan]);

  React.useEffect(() => {
    if (Platform.OS === "web") return;
    const onUpdate = () => {
      queueMicrotask(() => {
        queryClient.invalidateQueries({ queryKey: ["revenuecat_plan"] });
      });
    };
    Purchases.addCustomerInfoUpdateListener(onUpdate);
  }, [queryClient]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      plan,
      status: subscriptionStatus,
      isFoundingMember: founding,
      isPremium,
      isLoading,
      paywallVisible,
      paywallOptions,
      openPaywall,
      closePaywall,
      isAtLeast,
      ensurePlan,
      ensurePremium,
      refetchEntitlement,
      featureRequiresPremium,
      minimumPlanForFeature,
      canAccessFeature,
      miloConversationsRemaining,
      aiJournalEntriesRemaining,
      canStartAiJournal,
    }),
    [
      plan,
      subscriptionStatus,
      founding,
      isPremium,
      isLoading,
      paywallVisible,
      paywallOptions,
      openPaywall,
      closePaywall,
      isAtLeast,
      ensurePlan,
      ensurePremium,
      refetchEntitlement,
      featureRequiresPremium,
      minimumPlanForFeature,
      canAccessFeature,
      miloConversationsRemaining,
      aiJournalEntriesRemaining,
      canStartAiJournal,
    ]
  );

  const paywallCopy =
    paywallOptions.copyVariant && PAYWALL_COPY[paywallOptions.copyVariant]
      ? PAYWALL_COPY[paywallOptions.copyVariant]
      : PAYWALL_COPY.default;

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <PremiumPaywallModal
        visible={paywallVisible}
        onClose={closePaywall}
        source={paywallOptions.source}
        requiredPlan={paywallOptions.requiredPlan ?? paywallCopy.requiredPlan}
        title={paywallCopy.title}
        body={paywallCopy.body}
        foundingSpotsRemaining={subscriptionStatus?.foundingSpotsRemaining ?? null}
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

export { isActivePremium, getActivePlanFromRow };
