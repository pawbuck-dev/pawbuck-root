import { useTheme } from "@/context/themeContext";
import { isRevenueCatConfigured } from "@/services/revenuecat";
import { presentRevenueCatPaywall } from "@/services/revenuecatPaywall";
import { trackSubscriptionEvent } from "@/utils/subscriptionAnalytics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
  /** Where the paywall was opened from (analytics). */
  source?: string;
  /** Refresh Supabase + RevenueCat entitlement after a successful purchase/restore. */
  refetchEntitlement: () => Promise<void>;
};

function openStoreSubscriptionSettings(): void {
  if (Platform.OS === "ios") {
    void Linking.openURL("https://apps.apple.com/account/subscriptions");
  } else {
    void Linking.openURL("https://play.google.com/store/account/subscriptions");
  }
}

/**
 * Contextual upgrade sheet; primary CTA presents the RevenueCat paywall on iOS/Android when configured.
 */
export default function PremiumPaywallModal({
  visible,
  onClose,
  source,
  refetchEntitlement,
}: PremiumPaywallModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [presenting, setPresenting] = useState(false);

  const handleSubscribe = async () => {
    void trackSubscriptionEvent("paywall_subscribe_tap", { source: source ?? "unknown" });

    if (Platform.OS === "web") {
      openStoreSubscriptionSettings();
      return;
    }

    setPresenting(true);
    try {
      const success = await presentRevenueCatPaywall();
      if (success) {
        await refetchEntitlement();
        void trackSubscriptionEvent("paywall_purchase_success", { source: source ?? "unknown" });
        onClose();
        return;
      }
      if (!isRevenueCatConfigured()) {
        openStoreSubscriptionSettings();
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
              PawBuck Premium
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 15, color: theme.secondary, marginBottom: 16, lineHeight: 22 }}>
            Unlock Milo AI, weekly challenges, pet journal tools, and vet booking when available. Health records stay free.
          </Text>
          <View style={{ gap: 10, marginBottom: 18 }}>
            {["Milo AI assistant", "Weekly challenges & leaderboard", "Pet journal & Milo interviews", "Vet booking (coming soon)"].map(
              (line) => (
                <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#2BA89E" />
                  <Text style={{ fontSize: 14, color: theme.foreground, flex: 1 }}>{line}</Text>
                </View>
              )
            )}
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
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>View subscription options</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: theme.secondary, fontWeight: "600", fontSize: 15 }}>Maybe later</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 11, color: theme.secondary, textAlign: "center", marginTop: 8 }}>
            Subscriptions are billed by Apple or Google. Restore purchases from your store account after subscribing in-app (when enabled).
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
