import { PAWTHON_TEAL, PAWTHON_TEAL_DARK } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, Text, View } from "react-native";

const walkerArt = require("@/assets/images/walker.png");

/** Figma: Title_Poppins/18/SemiBold — Text-primary #0D0F0F */
const TEXT_PRIMARY = "#0D0F0F";
const TITLE_18_SEMIBOLD = {
  fontFamily: "Poppins_600SemiBold" as const,
  fontSize: 18,
  lineHeight: 21.6, // 120% of 18px
  color: TEXT_PRIMARY,
  textTransform: "capitalize" as const,
};

export type DailyGoalWalkCardProps = {
  /** Pet name for headline, e.g. "Max" → "Your Max's Counting On You Today" */
  petName: string;
  onStartWalk: () => void;
  /** Walk stats / hub — use Pawthon hub until a dedicated history screen exists */
  onHistory: () => void;
};

/**
 * Figma-style “Daily Goal” hero above Weekly Challenge: sky gradient, badge, History,
 * headline + paws, Start a Walk CTA, walker illustration (`assets/images/walker.png`).
 */
export default function DailyGoalWalkCard({ petName, onStartWalk, onHistory }: DailyGoalWalkCardProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const skyLight = ["#F5FAFF", "#E3F2FD", "#D6EBFA"] as const;
  const skyDark = ["#1A2832", "#243B47", "#1E3240"] as const;
  const rayColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)";
  const badgeBorder = isDark ? "rgba(38, 193, 193, 0.55)" : "rgba(11, 150, 150, 0.35)";
  const badgeLabel = isDark ? "#7DD3D3" : "#0B9696";
  /** Dark: primary text on sky card (inverse of light Text-primary) */
  const titlePrimaryColor = isDark ? "#FFFFFF" : TEXT_PRIMARY;
  const historyColor = isDark ? "#7EB8FF" : "#1565C0";

  const possessive = petName.trim() ? `${petName.trim()}'s` : "Pup's";

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
      <LinearGradient
        colors={isDark ? [...skyDark] : [...skyLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(13, 15, 15, 0.06)",
        }}
      >
        {/* Soft light rays from top-right (sky) */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -60,
            top: -80,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: rayColor,
            opacity: 0.9,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 40,
            top: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: rayColor,
            opacity: 0.45,
          }}
        />

        <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: badgeBorder,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
              }}
            >
              <Ionicons name="flame" size={16} color="#FF8A42" style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 13,
                  color: badgeLabel,
                }}
              >
                Daily Goal
              </Text>
            </View>
            <Pressable onPress={onHistory} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                  color: historyColor,
                }}
              >
                History
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8, zIndex: 2 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                <Text
                  style={[
                    TITLE_18_SEMIBOLD,
                    { color: titlePrimaryColor },
                  ]}
                >
                  Your {possessive} Counting On You Today{" "}
                </Text>
                <Ionicons name="paw" size={18} color={titlePrimaryColor} style={{ marginRight: 2 }} />
                <Ionicons name="paw" size={18} color={titlePrimaryColor} />
              </View>

              <Pressable onPress={onStartWalk} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
                <LinearGradient
                  colors={[PAWTHON_TEAL, PAWTHON_TEAL_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 28,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: "rgba(255,255,255,0.9)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  </View>
                  <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: "#FFFFFF" }}>
                    Start a Walk
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            <View
              style={{
                width: 132,
                height: 148,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <Image
                source={walkerArt}
                style={{ width: 132, height: 148 }}
                contentFit="contain"
                accessibilityLabel={`Illustration of walking ${petName}`}
              />
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
