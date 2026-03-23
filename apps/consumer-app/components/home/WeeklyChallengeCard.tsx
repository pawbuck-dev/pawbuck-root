import { PawthonTrophyIllustration } from "@/components/pawthon/PawthonTrophyIllustration";
import { useTheme } from "@/context/themeContext";
import {
  formatWeeklyChallengeFigmaLine,
  formatWeeklyWalkerRankLine,
} from "@/services/walkSessions";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type WeeklyChallengeCardProps = {
  petName?: string;
  weekKm?: number;
  streakDays?: number;
  /** From `pawthon_my_weekly_walker_rank`; null rank = no walks this week yet */
  walkerRank?: number | null;
  walkerTotal?: number;
  onPress?: () => void;
};

/** Figma light (screenshot + Frame.svg tokens); dark keeps Pawthon product copy. */
const LIGHT = {
  /** Card fill — match simulator/Figma cream */
  gradient: ["#FDF8F1", "#FBF4EA"] as const,
  label: "#0D0F0F",
  title: "#0D0F0F",
  /** Muted body from Frame.svg footnote */
  sub: "#727979",
  border: "rgba(13, 15, 15, 0.06)",
};

/**
 * Dashboard Pawthon / weekly challenge card.
 * - Light: Figma PawBuck redesign (WEEKLY CHALLENGE, trophy.png, pet-parents line).
 * - Dark: PAWTHON + walk with pet + week stats.
 */
export default function WeeklyChallengeCard({
  petName,
  weekKm = 0,
  streakDays = 0,
  walkerRank,
  walkerTotal = 0,
  onPress,
}: WeeklyChallengeCardProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const creamBg = isDark ? (["#2A2622", "#1E1C1A", "#252220"] as const) : LIGHT.gradient;
  const sunburstRay = isDark ? "rgba(255,255,255,0.04)" : "rgba(209, 157, 0, 0.12)";
  const labelColor = isDark ? "rgba(255,255,255,0.55)" : LIGHT.label;
  const titleColor = isDark ? "#FFFFFF" : LIGHT.title;
  const subColor = isDark ? "rgba(255,255,255,0.65)" : LIGHT.sub;

  const rankLine = isDark
    ? formatWeeklyWalkerRankLine(walkerRank, walkerTotal)
    : formatWeeklyChallengeFigmaLine(walkerRank, walkerTotal);

  const content = (
    <LinearGradient
      colors={[...creamBg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: isDark ? 1 : 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : LIGHT.border,
      }}
    >
      {/* Decorative glow — dark: two blobs; light: soft gold hint (Figma sunburst behind trophy) */}
      <View
        style={{
          position: "absolute",
          right: isDark ? -40 : -36,
          top: isDark ? "15%" : "8%",
          width: isDark ? 220 : 200,
          height: isDark ? 220 : 200,
          borderRadius: 110,
          backgroundColor: sunburstRay,
          opacity: isDark ? 0.9 : 0.85,
        }}
      />
      {isDark ? (
        <View
          style={{
            position: "absolute",
            right: 20,
            bottom: -30,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: "rgba(255,255,255,0.04)",
            opacity: 0.5,
          }}
        />
      ) : (
        <View
          style={{
            position: "absolute",
            right: -24,
            bottom: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: "rgba(255, 253, 248, 0.9)",
            opacity: 0.7,
          }}
        />
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: isDark ? 18 : 20,
          paddingLeft: isDark ? 20 : 20,
          paddingRight: isDark ? 8 : 10,
          minHeight: isDark ? 152 : 160,
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 0,
            paddingRight: isDark ? 8 : 10,
            zIndex: 2,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 11,
              letterSpacing: isDark ? 1.2 : 1.4,
              color: labelColor,
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            {isDark ? "PAWTHON" : "WEEKLY CHALLENGE"}
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: isDark ? 22 : 24,
              lineHeight: isDark ? 28 : 30,
              color: titleColor,
              marginBottom: 8,
            }}
          >
            {isDark
              ? petName
                ? `Walk with ${petName}`
                : "Track your walks"
              : "Are You The Best?"}
          </Text>
          {isDark ? (
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
          ) : null}
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: subColor,
              marginBottom: 4,
            }}
          >
            {rankLine}
          </Text>
          {onPress ? (
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 13,
                lineHeight: 18,
                color: subColor,
                marginTop: 2,
              }}
            >
              Tap to start a walk →
            </Text>
          ) : null}
        </View>

        <PawthonTrophyIllustration size={isDark ? 140 : 158} />
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
