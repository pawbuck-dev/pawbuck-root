import { presentRevenueCatPaywall } from "@/services/revenuecatPaywall";
import { isRevenueCatConfigured } from "@/services/revenuecat";
import { resolvePaywallSubscribeResult } from "@/utils/paywallSubscribeFlow";
import { trackSubscriptionEvent } from "@/utils/subscriptionAnalytics";
import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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
import PlanComparisonModal from "@/components/subscription/PlanComparisonModal";

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

function openStoreSubscriptionSettings(): void {
  if (Platform.OS === "ios") {
    void Linking.openURL("https://apps.apple.com/account/subscriptions");
  } else {
    void Linking.openURL("https://play.google.com/store/account/subscriptions");
  }
}

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
  const [presenting, setPresenting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

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
    void trackSubscriptionEvent("paywall_dismiss", { source: source ?? "unknown" });
    onClose();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={handleClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.card,
              borderRadius: 20,
              padding: 22,
              maxWidth: 400,
              alignSelf: "center",
              width: "100%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? "rgba(59,208,210,0.2)" : "rgba(43,168,158,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="sparkles" size={24} color="#2BA89E" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground, flex: 1 }}>
                {title ?? `Upgrade to ${planLabel}`}
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 15, color: theme.secondary, marginBottom: 12, lineHeight: 22 }}>
              {body ??
                (requiredPlan === "family"
                  ? "Manage unlimited pets and share access with your household."
                  : "Unlock unlimited Milo, documents, and vet prep tools. Health records stay free.")}
            </Text>
            {foundingSpotsRemaining != null && foundingSpotsRemaining > 0 ? (
              <Text
                style={{
                  fontSize: 13,
                  color: "#2BA89E",
                  fontWeight: "600",
                  marginBottom: 12,
                }}
              >
                Founding Member lifetime — {foundingSpotsRemaining} spots left
              </Text>
            ) : null}
            <View style={{ gap: 10, marginBottom: 18 }}>
              {featureLines.map((line) => (
                <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#2BA89E" />
                  <Text style={{ fontSize: 14, color: theme.foreground, flex: 1 }}>{line}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => void handleSubscribe()}
              disabled={presenting}
              style={{
                backgroundColor: "#2BA89E",
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                marginBottom: 10,
                opacity: presenting ? 0.7 : 1,
              }}
            >
              {presenting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                  Subscribe to {planLabel}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowComparison(true)}
              style={{ paddingVertical: 12, alignItems: "center", marginBottom: 6 }}
            >
              <Text style={{ color: theme.primary, fontWeight: "600", fontSize: 15 }}>Compare plans</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ color: theme.secondary, fontWeight: "600", fontSize: 15 }}>Maybe later</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: theme.secondary, textAlign: "center", marginTop: 8 }}>
              Individual from $5.99/mo · Family from $9.99/mo. Billed by Apple or Google.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
      <PlanComparisonModal
        visible={showComparison}
        onClose={() => setShowComparison(false)}
        onSubscribe={(plan) => {
          setShowComparison(false);
          void handleSubscribe(plan);
        }}
      />
    </>
  );
}
