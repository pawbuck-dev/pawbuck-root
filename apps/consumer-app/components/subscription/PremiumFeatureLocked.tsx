import { useTheme } from "@/context/themeContext";
import { useSubscription } from "@/context/subscriptionContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PremiumFeatureLockedProps = {
  title: string;
  onGoBack: () => void;
  /** Passed to paywall analytics. */
  feature: string;
};

/**
 * Full-screen placeholder when a premium route is opened by a free user.
 */
export default function PremiumFeatureLocked({ title, onGoBack, feature }: PremiumFeatureLockedProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const { openPaywall } = useSubscription();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={onGoBack} hitSlop={12} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={26} color={theme.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600", color: theme.foreground, marginLeft: 4 }}>{title}</Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
        <View
          style={{
            alignSelf: "center",
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: isDark ? "rgba(59,208,210,0.2)" : "rgba(43,168,158,0.12)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons name="lock-closed-outline" size={36} color="#2BA89E" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground, textAlign: "center", marginBottom: 10 }}>
          Premium feature
        </Text>
        <Text style={{ fontSize: 15, color: theme.secondary, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
          Upgrade to PawBuck Premium to use {title} and other advanced tools. Your health records stay free.
        </Text>
        <TouchableOpacity
          onPress={() => openPaywall(feature)}
          style={{
            backgroundColor: "#2BA89E",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>See plans</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
