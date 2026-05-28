import { getPawthonSurfaceTokens } from "@/components/pawthon/pawthonSurfaceTokens";
import { PAWTHON_STREAK_DAY_MIN_METERS } from "@/constants/pawthon";
import { formatMiles, metersToMiles } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type PawthonStreakBannerProps = {
  petName: string;
  streakDays: number;
  todayMeters: number;
  onPress: () => void;
};

export function PawthonStreakBanner({
  petName,
  streakDays,
  todayMeters,
  onPress,
}: PawthonStreakBannerProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getPawthonSurfaceTokens(isDark, theme);
  const needM = Math.max(0, PAWTHON_STREAK_DAY_MIN_METERS - todayMeters);
  const safe = needM <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: surfaces.peachBanner,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        gap: 12,
      }}
      accessibilityRole="button"
    >
      <Ionicons name="flame" size={28} color="#FF8A42" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 15, color: theme.foreground }}>
          {streakDays >= 2 ? `${streakDays}-day streak with ${petName}` : `Build a streak with ${petName}`}
        </Text>
        <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: theme.secondary, marginTop: 4 }}>
          {safe
            ? "Streak safe for today"
            : `${formatMiles(metersToMiles(needM))} mi more to protect your streak`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.secondary} />
    </Pressable>
  );
}
