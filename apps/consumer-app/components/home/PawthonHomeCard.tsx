import { PawthonProgressRing } from "@/components/pawthon/PawthonProgressRing";
import { PawthonWalkHistoryCard } from "@/components/pawthon/PawthonWalkHistoryCard";
import { CTA } from "@/components/ui/CTA";
import { formatMiles, metersToMiles } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import type { WalkSessionRow } from "@/services/walkSessions";
import {
  formatLastWalkKicker,
  formatWalkDistanceDuration,
} from "@/utils/pawthonWalkDisplay";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

const walkerArt = require("@/assets/images/walker.png");

const TITLE = {
  fontFamily: "Poppins_600SemiBold" as const,
  fontSize: 17,
  lineHeight: 22,
};

export type PawthonHomeCardProps = {
  petName: string;
  goalMeters: number;
  todayMeters: number;
  lastWalk: WalkSessionRow | null;
  onStartWalk: () => void;
  onViewLog: () => void;
  onViewLastWalk: () => void;
  variant?: "hero" | "compact";
};

export default function PawthonHomeCard({
  petName,
  goalMeters,
  todayMeters,
  lastWalk,
  onStartWalk,
  onViewLog,
  onViewLastWalk,
  variant = "compact",
}: PawthonHomeCardProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const isAndroid = Platform.OS === "android";

  const cardBorderStyle = isAndroid
    ? {}
    : {
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      };

  const skyLight = ["#F5FAFF", "#E3F2FD", "#D6EBFA"] as const;
  const skyDark = ["#1A2832", "#243B47", "#1E3240"] as const;
  const rayColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)";
  const badgeBorder = isDark ? "rgba(38, 193, 193, 0.55)" : "rgba(11, 150, 150, 0.35)";
  const badgeLabel = isDark ? "#7DD3D3" : "#0B9696";

  const possessive = petName.trim() ? `${petName.trim()}'s` : "Pup's";
  const progress = goalMeters > 0 ? todayMeters / goalMeters : 0;
  const goalMi = formatMiles(metersToMiles(goalMeters));
  const todayMi = formatMiles(metersToMiles(todayMeters));
  const remainingMi = formatMiles(metersToMiles(Math.max(0, goalMeters - todayMeters)));

  const subtitle =
    progress >= 1
      ? "Goal met for today"
      : todayMeters > 0
        ? `${remainingMi} mi to go`
        : `Today's goal: ${goalMi} mi`;

  const showIllustration = variant === "compact";
  const contentPadding = variant === "compact" ? 16 : 20;
  const illoReserve = showIllustration ? 88 : 0;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: variant === "compact" ? 16 : 20 }}>
      <LinearGradient
        colors={isDark ? [...skyDark] : [...skyLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: variant === "compact" ? 16 : 20,
          overflow: "hidden",
          ...cardBorderStyle,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -48,
            top: -64,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: rayColor,
            opacity: 0.55,
          }}
        />

        <View
          style={{
            paddingTop: contentPadding,
            paddingBottom: contentPadding,
            paddingLeft: contentPadding,
            paddingRight: contentPadding,
          }}
        >
          {/* Header: goal badge, title, progress */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 14,
              paddingRight: illoReserve > 0 ? 4 : 0,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: badgeBorder,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
                  marginBottom: 10,
                }}
              >
                <Ionicons name="flame" size={14} color="#FF8A42" style={{ marginRight: 4 }} />
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: badgeLabel }}>
                  Daily Goal
                </Text>
              </View>

              <Text style={[TITLE, { color: theme.foreground }]} numberOfLines={2}>
                {possessive} Counting{"\n"}On You Today
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: theme.secondary,
                  marginTop: 6,
                  fontFamily: "Poppins_500Medium",
                  lineHeight: 18,
                }}
                numberOfLines={2}
              >
                {todayMi} / {goalMi} mi · {subtitle}
              </Text>
            </View>

            <PawthonProgressRing progress={progress} size={52} />
          </View>

          {/* Last walk — full width */}
          {lastWalk ? (
            <PawthonWalkHistoryCard
              kicker={formatLastWalkKicker(lastWalk.ended_at)}
              title={formatWalkDistanceDuration(lastWalk)}
              onPress={onViewLastWalk}
              onGradientSurface
            />
          ) : (
            <Text
              style={{
                fontSize: 13,
                color: theme.secondary,
                marginBottom: 14,
                lineHeight: 19,
                fontFamily: "Poppins_500Medium",
              }}
            >
              First walk unlocks your route map.
            </Text>
          )}

          {/* Actions — full width, clear of illustration */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              paddingRight: illoReserve,
            }}
          >
            <CTA
              label="Start a Walk"
              onPress={onStartWalk}
              size="SM"
              containerStyle={{ alignSelf: "flex-start" }}
              leftIcon={
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.9)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="play" size={7} color="#FFFFFF" />
                </View>
              }
            />
            <Pressable onPress={onViewLog} hitSlop={10} accessibilityRole="button">
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.primary,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Walk log
              </Text>
            </Pressable>
          </View>
        </View>

        {showIllustration ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: 4,
              bottom: 0,
              width: 96,
              height: 96,
            }}
          >
            <Image
              source={walkerArt}
              style={{ width: 96, height: 96 }}
              contentFit="contain"
              accessibilityLabel={`Walking ${petName}`}
            />
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}
