import { PAWTHON_STREAK_DAY_MIN_METERS } from "@/constants/pawthon";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type PawthonWalkLogRowProps = {
  dateLabel: string;
  petName: string;
  distanceMi: string;
  durationLabel: string;
  paceLabel?: string | null;
  distanceMeters: number;
  onPress: () => void;
};

export function PawthonWalkLogRow({
  dateLabel,
  petName,
  distanceMi,
  durationLabel,
  paceLabel,
  distanceMeters,
  onPress,
}: PawthonWalkLogRowProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const qualified = distanceMeters >= PAWTHON_STREAK_DAY_MIN_METERS;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        gap: 12,
      }}
      accessibilityRole="button"
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          backgroundColor: isDark ? "rgba(56,189,189,0.15)" : "rgba(59,208,210,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="map-outline" size={24} color={theme.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 15, color: theme.foreground }}>
          {dateLabel}
        </Text>
        <Text
          style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: theme.secondary, marginTop: 4 }}
          numberOfLines={2}
        >
          {petName} · {distanceMi} mi · {durationLabel}
          {paceLabel ? ` · ${paceLabel}` : ""}
        </Text>
        {qualified ? (
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: PAWTHON_TEAL, marginTop: 4 }}>
            Streak qualified
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.secondary} />
    </Pressable>
  );
}
