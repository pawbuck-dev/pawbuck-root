import { useTheme } from "@/context/themeContext";
import { useSubscription } from "@/context/subscriptionContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

/**
 * Home / profile teaser for free users — opens the paywall.
 */
export default function PremiumUpsellCard() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { openPaywall, isPremium, isLoading } = useSubscription();

  if (isLoading || isPremium) return null;

  const cardBorder =
    Platform.OS === "android"
      ? {}
      : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => openPaywall("home_upsell_card")}
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 24,
        ...cardBorder,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isDark ? "rgba(59,208,210,0.2)" : "rgba(43,168,158,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles" size={22} color="#2BA89E" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Unlock PawBuck Premium</Text>
          <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4, lineHeight: 18 }}>
            Milo AI, weekly challenges, pet journal tools, and vet booking when available.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
      </View>
    </TouchableOpacity>
  );
}
