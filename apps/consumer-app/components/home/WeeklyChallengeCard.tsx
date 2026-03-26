import { PawthonTrophyIllustration } from "@/components/pawthon/PawthonTrophyIllustration";
import { useTheme } from "@/context/themeContext";
import { formatWeeklyChallengeFigmaLine } from "@/services/walkSessions";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

/** Background-only export (text paths removed) — Metro resolves reliably with relative require. */
const weeklyChallengeDarkBg = require("../../assets/images/weeklychallengedark-bg.svg");

export type WeeklyChallengeCardProps = {
  petName?: string;
  weekKm?: number;
  streakDays?: number;
  /** From `pawthon_my_weekly_walker_rank`; null rank = no walks this week yet */
  walkerRank?: number | null;
  walkerTotal?: number;
  onPress?: () => void;
};

/** Figma weekly challenge card (light cream + dark SVG); same copy stack in both modes. */
const LIGHT = {
  /** Card fill — match simulator/Figma cream */
  gradient: ["#FDF8F1", "#FBF4EA"] as const,
  label: "#0D0F0F",
  title: "#0D0F0F",
  /** Muted body from Frame.svg footnote */
  sub: "#727979",
};

/**
 * Dashboard weekly challenge — Figma layout: kicker → “Are You The Best?” → pet-parent rank 👀.
 * Dark uses `weeklychallengedark-bg.svg`; light uses cream gradient until a light SVG exists.
 */
export default function WeeklyChallengeCard({
  petName: _petName,
  weekKm: _weekKm = 0,
  streakDays: _streakDays = 0,
  walkerRank,
  walkerTotal = 0,
  onPress,
}: WeeklyChallengeCardProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const isAndroid = Platform.OS === "android";

  /** Same card chrome as BookVetVisitSection / DailyGoalWalkCard */
  const cardBorderStyle = isAndroid
    ? {}
    : {
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      };

  const creamBg = LIGHT.gradient;
  const sunburstRay = "rgba(209, 157, 0, 0.12)";
  const labelColor = isDark ? "rgba(255,255,255,0.55)" : LIGHT.label;
  const titleColor = isDark ? "#FFFFFF" : LIGHT.title;
  const subColor = isDark ? "rgba(255,255,255,0.65)" : LIGHT.sub;

  const rankLine = formatWeeklyChallengeFigmaLine(walkerRank, walkerTotal);

  const kickerLetterSpacing = isDark ? 1.2 : 1.4;

  const cardInner = (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        ...cardBorderStyle,
        position: "relative",
      }}
    >
      {/* Dark: Figma card SVG (background + gold accents). Light: cream gradient until light SVG is added. */}
      {isDark ? (
        <Image
          source={weeklyChallengeDarkBg}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : (
        <>
          <LinearGradient
            colors={[...creamBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: -36,
              top: "8%",
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: sunburstRay,
              opacity: 0.85,
            }}
          />
          <View
            pointerEvents="none"
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
        </>
      )}

      {/* Content above background (zIndex ensures SVG/Image stays behind). */}
      <View style={{ flexDirection: "row", minHeight: 180, zIndex: 1 }}>
        <View style={{ flex: 1, padding: 20, justifyContent: "center", zIndex: 2, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 11,
              letterSpacing: kickerLetterSpacing,
              textTransform: "uppercase",
              color: labelColor,
              marginBottom: 8,
            }}
          >
            WEEKLY CHALLENGE
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              lineHeight: 22,
              color: titleColor,
              marginBottom: 12,
            }}
            numberOfLines={2}
          >
            Are You The Best?
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: subColor,
            }}
          >
            {rankLine}
          </Text>
        </View>

        <View
          style={{
            width: 150,
            justifyContent: "flex-end",
            alignItems: "flex-end",
            zIndex: 1,
          }}
        >
          <PawthonTrophyIllustration
            size={160}
            containerStyle={{
              justifyContent: "flex-end",
              alignItems: "flex-end",
              marginBottom: -4,
              marginRight: -8,
            }}
          />
        </View>
      </View>
    </View>
  );

  const outer = { paddingHorizontal: 20, alignSelf: "stretch" as const, width: "100%" as const };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Weekly challenge, open leaderboard"
        style={({ pressed }) => [outer, { opacity: pressed ? 0.92 : 1 }]}
      >
        {cardInner}
      </Pressable>
    );
  }

  return <View style={outer}>{cardInner}</View>;
}
