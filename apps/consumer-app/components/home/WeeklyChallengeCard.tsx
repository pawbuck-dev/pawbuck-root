import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type WeeklyChallengeCardProps = {
  petName?: string;
  /** Kilometers walked this ISO week (selected pet). */
  weekKm?: number;
  /** Consecutive days meeting the walk goal. */
  streakDays?: number;
  /** How many pet parents rank above the user (placeholder until leaderboards ship). */
  rankAhead?: number;
  /** Total participants in the weekly challenge (placeholder). */
  totalInChallenge?: number;
  onPress?: () => void;
};

/**
 * Dashboard hero — Weekly Challenge (Figma PawBuck App Redesign ~1896-122224).
 * Cream card, sunburst warmth, headline + rank copy, trophy with tilted blue frame.
 */
export default function WeeklyChallengeCard({
  petName,
  weekKm = 0,
  streakDays = 0,
  rankAhead = 6,
  totalInChallenge = 247,
  onPress,
}: WeeklyChallengeCardProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const creamBg = isDark ? ["#2A2622", "#1E1C1A", "#252220"] : ["#FFFDF8", "#FAF3E8", "#FFF9F0"];
  const sunburstRay = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)";
  const labelColor = isDark ? "rgba(255,255,255,0.55)" : "#1A1A1A";
  const titleColor = isDark ? "#FFFFFF" : "#0D0F0F";
  const subColor = isDark ? "rgba(255,255,255,0.65)" : "#5A5F6A";
  const frameBlue = isDark ? "#42A5F5" : "#1E88E5";
  const trophyGold = "#D4AF37";

  const content = (
    <LinearGradient
      colors={creamBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent",
      }}
    >
      {/* Soft sunburst (radial-ish wedges from center-right) */}
      <View
        style={{
          position: "absolute",
          right: -40,
          top: "15%",
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: sunburstRay,
          opacity: 0.9,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 20,
          bottom: -30,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: sunburstRay,
          opacity: 0.5,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 20,
          paddingLeft: 20,
          paddingRight: 12,
          minHeight: 132,
        }}
      >
        <View style={{ flex: 1, paddingRight: 8, zIndex: 2 }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 11,
              letterSpacing: 1.2,
              color: labelColor,
              marginBottom: 6,
            }}
          >
            PAWTHON
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 22,
              lineHeight: 28,
              color: titleColor,
              marginBottom: 8,
            }}
          >
            {petName ? `Walk with ${petName}` : "Track your walks"}
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: subColor,
              marginBottom: 4,
            }}
          >
            This week: {weekKm.toFixed(1)} km · {streakDays}-day streak
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 13,
              lineHeight: 18,
              color: subColor,
            }}
          >
            {onPress ? "Tap to start a walk →" : `Leaderboard preview: #${rankAhead} of ${totalInChallenge}`}
          </Text>
        </View>

        {/* Trophy + tilted blue frame (Figma decorative square) */}
        <View style={{ width: 112, height: 112, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{
              position: "absolute",
              width: 88,
              height: 88,
              borderWidth: 2.5,
              borderColor: frameBlue,
              borderRadius: 6,
              transform: [{ rotate: "-14deg" }],
            }}
          />
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <View style={{ position: "relative", alignItems: "center" }}>
              <Ionicons name="trophy" size={64} color={trophyGold} />
              <View
                style={{
                  position: "absolute",
                  top: 20,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="star" size={9} color="#FFFFFF" style={{ marginHorizontal: 2 }} />
                <Ionicons name="star" size={9} color="#FFFFFF" style={{ marginHorizontal: 2 }} />
                <Ionicons name="star" size={9} color="#FFFFFF" style={{ marginHorizontal: 2 }} />
              </View>
            </View>
            <View
              style={{
                width: 44,
                height: 7,
                borderRadius: 4,
                backgroundColor: isDark ? "#3D3A36" : "#2C2C2C",
                marginTop: 2,
              }}
            />
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const wrap = { marginHorizontal: 20 };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }, wrap]}>
        {content}
      </Pressable>
    );
  }

  return <View style={wrap}>{content}</View>;
}
