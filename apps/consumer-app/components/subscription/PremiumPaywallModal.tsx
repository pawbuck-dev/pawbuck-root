import { useTheme } from "@/context/themeContext";
import { trackSubscriptionEvent } from "@/utils/subscriptionAnalytics";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
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
};

/**
 * Contextual upgrade sheet. Wire IAP / RevenueCat here when products are configured.
 */
export default function PremiumPaywallModal({ visible, onClose, source }: PremiumPaywallModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const handleSubscribe = () => {
    void trackSubscriptionEvent("paywall_subscribe_tap", { source: source ?? "unknown" });
    // Placeholder until RevenueCat + store products are linked.
    if (Platform.OS === "ios") {
      void Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else {
      void Linking.openURL("https://play.google.com/store/account/subscriptions");
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
            onPress={handleSubscribe}
            style={{
              backgroundColor: "#2BA89E",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>View subscription options</Text>
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
