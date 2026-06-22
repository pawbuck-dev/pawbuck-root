import PlanComparisonModal from "@/components/subscription/PlanComparisonModal";
import { getSubscriptionModalTokens } from "@/components/subscription/subscriptionModalTokens";
import { CTA } from "@/components/ui/CTA";
import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import { useTheme } from "@/context/themeContext";
import { useSubscriptionOfferingPrices } from "@/hooks/useSubscriptionOfferingPrices";
import { isRevenueCatConfigured } from "@/services/revenuecat";
import { presentRevenueCatPaywall } from "@/services/revenuecatPaywall";
import { purchaseSubscriptionPackage } from "@/services/revenuecatOfferings";
import { resolvePaywallSubscribeResult } from "@/utils/paywallSubscribeFlow";
import { openStoreSubscriptionSettings } from "@/utils/storeSubscriptions";
import { trackSubscriptionEvent } from "@/utils/subscriptionAnalytics";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PremiumPaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  source?: string;
  requiredPlan?: SubscriptionPlan;
  title?: string;
  body?: string;
  foundingSpotsRemaining?: number | null;
  refetchEntitlement: () => Promise<void>;
};

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: "Free",
  individual: "Individual",
  family: "Family",
};

const INDIVIDUAL_FEATURES = [
  "Unlimited Milo AI conversations",
  "Unlimited AI journal entries",
  "Unlimited document uploads",
  "Pet Passport PDF export",
  "Full vet prep briefs",
];

const FAMILY_FEATURES = [
  "Everything in Individual",
  "Unlimited pet profiles",
  "Family sharing (up to 5 members)",
  "Multi-pet household dashboard",
];

export default function PremiumPaywallModal({
  visible,
  onClose,
  source,
  requiredPlan = "individual",
  title,
  body,
  foundingSpotsRemaining,
  refetchEntitlement,
}: PremiumPaywallModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getSubscriptionModalTokens(theme, isDark), [theme, isDark]);
  const { data: offeringPrices } = useSubscriptionOfferingPrices(visible);
  const [presenting, setPresenting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowComparison(false);
    }
  }, [visible]);

  const planLabel = PLAN_LABEL[requiredPlan];
  const featureLines = requiredPlan === "family" ? FAMILY_FEATURES : INDIVIDUAL_FEATURES;

  const handleSubscribe = async (targetPlan: SubscriptionPlan = requiredPlan) => {
    void trackSubscriptionEvent("paywall_subscribe_tap", {
      source: source ?? "unknown",
      target_plan: targetPlan,
    });

    if (Platform.OS === "web") {
      openStoreSubscriptionSettings();
      return;
    }

    setPresenting(true);
    try {
      if (targetPlan === "individual" || targetPlan === "family") {
        const direct = await purchaseSubscriptionPackage(targetPlan, "monthly");
        if (direct.purchased) {
          await refetchEntitlement();
          void trackSubscriptionEvent("paywall_purchase_success", {
            source: source ?? "unknown",
            target_plan: targetPlan,
          });
          onClose();
          return;
        }
        if (direct.cancelled) {
          return;
        }
      }

      const success = await presentRevenueCatPaywall();
      const result = resolvePaywallSubscribeResult({
        platform: Platform.OS === "ios" ? "ios" : "android",
        revenueCatConfigured: isRevenueCatConfigured(),
        paywallPresented: success || isRevenueCatConfigured(),
        purchaseSuccess: success,
      });

      if (result.action === "close") {
        await refetchEntitlement();
        void trackSubscriptionEvent("paywall_purchase_success", {
          source: source ?? "unknown",
          target_plan: targetPlan,
        });
        onClose();
        return;
      }
      if (result.action === "openStore") {
        openStoreSubscriptionSettings();
        return;
      }
      if (result.action === "showError") {
        Alert.alert("Subscription", result.message);
      }
    } finally {
      setPresenting(false);
    }
  };

  const handleClose = () => {
    setShowComparison(false);
    void trackSubscriptionEvent("paywall_dismiss", { source: source ?? "unknown" });
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible && !showComparison && !presenting}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: ui.scrim,
            justifyContent: "center",
            padding: 24,
          }}
          onPress={handleClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: ui.pageBg,
              borderRadius: 24,
              padding: 22,
              maxWidth: 400,
              alignSelf: "center",
              width: "100%",
              ...ui.panelBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: ui.iconWellBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="sparkles" size={24} color={theme.primary} />
              </View>
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 18,
                  color: ui.titleColor,
                  flex: 1,
                }}
              >
                {title ?? `Upgrade to ${planLabel}`}
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 14,
                lineHeight: 20,
                color: ui.mutedColor,
                marginBottom: 12,
              }}
            >
              {body ??
                (requiredPlan === "family"
                  ? "Manage unlimited pets and share access with your household."
                  : "Unlock unlimited Milo, documents, and vet prep tools. Health records stay free.")}
            </Text>

            {foundingSpotsRemaining != null && foundingSpotsRemaining > 0 ? (
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 13,
                  color: theme.primary,
                  marginBottom: 14,
                }}
              >
                Founding Member lifetime — {foundingSpotsRemaining} spots left
              </Text>
            ) : null}

            <View
              style={{
                borderRadius: 20,
                padding: 16,
                backgroundColor: ui.nestedBg,
                gap: 10,
                marginBottom: 18,
                ...(Platform.OS !== "android"
                  ? {
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    }
                  : {}),
              }}
            >
              {featureLines.map((line) => (
                <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 14,
                      lineHeight: 20,
                      color: theme.foreground,
                      flex: 1,
                    }}
                  >
                    {line}
                  </Text>
                </View>
              ))}
            </View>

            <CTA
              label={presenting ? "Opening…" : `Subscribe to ${planLabel}`}
              onPress={() => void handleSubscribe()}
              size="MD"
              style="Solid"
              disabled={presenting}
              state={presenting ? "Disable" : "Default"}
              leftIcon={
                presenting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                )
              }
              containerStyle={{ marginBottom: 10 }}
            />

            <TouchableOpacity
              onPress={() => setShowComparison(true)}
              style={{ paddingVertical: 12, alignItems: "center", marginBottom: 4 }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 15,
                  color: theme.primary,
                }}
              >
                Compare plans
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 10, alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 15,
                  color: theme.secondary,
                }}
              >
                Maybe later
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 11,
                lineHeight: 16,
                color: theme.secondary,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {offeringPrices?.individual.footerLine ??
                "Individual from $5.99/mo · Family from $9.99/mo. Billed by Apple or Google."}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      <PlanComparisonModal
        visible={visible && showComparison}
        onClose={() => setShowComparison(false)}
        subscribing={presenting}
        onSubscribe={(plan) => {
          setShowComparison(false);
          void handleSubscribe(plan);
        }}
      />
    </>
  );
}
