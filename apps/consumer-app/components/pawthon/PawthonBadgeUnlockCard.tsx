import { PAWTHON_BADGE_BY_ID, type PawthonBadgeId } from "@/constants/pawthonBadges";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export function PawthonBadgeUnlockCard({ badgeId }: { badgeId: PawthonBadgeId }) {
  const { theme } = useTheme();
  const badge = PAWTHON_BADGE_BY_ID[badgeId];

  return (
    <View
      style={{
        backgroundColor: "#FFF0E8",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text
        style={{
          fontFamily: "Poppins_600SemiBold",
          fontSize: 12,
          color: PAWTHON_TEAL,
          marginBottom: 12,
          letterSpacing: 0.5,
        }}
      >
        BADGE UNLOCKED
      </Text>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "rgba(38,193,193,0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons name={badge.icon} size={36} color={PAWTHON_TEAL} />
      </View>
      <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground }}>
        {badge.name}
      </Text>
      <Text
        style={{
          fontFamily: "Poppins_500Medium",
          fontSize: 14,
          color: theme.secondary,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        {badge.description}
      </Text>
    </View>
  );
}
