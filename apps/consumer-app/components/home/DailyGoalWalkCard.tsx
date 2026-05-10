import { CTA } from "@/components/ui/CTA";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Text, View } from "react-native";

const walkerArt = require("@/assets/images/walker.png");

const TITLE_18_SEMIBOLD = {
  fontFamily: "Poppins_600SemiBold" as const,
  fontSize: 18,
  lineHeight: 21.6,
  textTransform: "capitalize" as const,
};

const TITLE_COMPACT = {
  fontFamily: "Poppins_600SemiBold" as const,
  fontSize: 15,
  lineHeight: 20,
  textTransform: "capitalize" as const,
};

export type DailyGoalWalkCardProps = {
  petName: string;
  onStartWalk: () => void;
  /** `"hero"` = full Milo-style card; `"compact"` = shorter card for lower on home. */
  variant?: "hero" | "compact";
};

export default function DailyGoalWalkCard({
  petName,
  onStartWalk,
  variant = "hero",
}: DailyGoalWalkCardProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const isAndroid = Platform.OS === "android";
  const isCompact = variant === "compact";

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
  const textPrimary = theme.foreground;

  const possessive = petName.trim() ? `${petName.trim()}'s` : "Pup's";

  if (isCompact) {
    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <LinearGradient
          colors={isDark ? [...skyDark] : [...skyLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            ...cardBorderStyle,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: -40,
              top: -50,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: rayColor,
              opacity: 0.55,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", minHeight: 96, paddingVertical: 12 }}>
            <View style={{ flex: 1, paddingLeft: 16, paddingRight: 8, zIndex: 2, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: badgeBorder,
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
                  }}
                >
                  <Ionicons name="flame" size={14} color="#FF8A42" style={{ marginRight: 4 }} />
                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: badgeLabel }}>
                    Daily Goal
                  </Text>
                </View>
              </View>
              <Text style={[TITLE_COMPACT, { color: textPrimary }]} numberOfLines={2}>
                Your {possessive} walk · On you today
              </Text>
              <View style={{ marginTop: 10 }}>
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
              </View>
            </View>
            <View style={{ width: 88, alignItems: "flex-end", justifyContent: "flex-end", marginRight: 4 }}>
              <Image
                source={walkerArt}
                style={{ width: 92, height: 92, marginBottom: -6, marginRight: -4 }}
                contentFit="contain"
                accessibilityLabel={`Walking ${petName}`}
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <LinearGradient
        colors={isDark ? [...skyDark] : [...skyLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          overflow: "hidden",
          ...cardBorderStyle,
        }}
      >
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

        <View style={{ flexDirection: "row", minHeight: 180 }}>
          <View style={{ flex: 1, padding: 20, justifyContent: "space-between", zIndex: 2, minWidth: 0 }}>
            <View>
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    paddingVertical: 4,
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
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text
                  style={[TITLE_18_SEMIBOLD, { color: textPrimary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Your {possessive} Counting
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "nowrap",
                    alignItems: "center",
                    marginTop: 2,
                    minWidth: 0,
                  }}
                >
                  <Text
                    style={[TITLE_18_SEMIBOLD, { color: textPrimary, flexShrink: 1 }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    On You Today
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexShrink: 0,
                      alignItems: "center",
                      marginLeft: 4,
                    }}
                  >
                    <Ionicons name="paw" size={18} color={textPrimary} style={{ marginRight: 2 }} />
                    <Ionicons name="paw" size={18} color={textPrimary} />
                  </View>
                </View>
              </View>
            </View>

            <CTA
              label="Start a Walk"
              onPress={onStartWalk}
              size="SM"
              containerStyle={{ alignSelf: "flex-start" }}
              leftIcon={
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.9)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="play" size={8} color="#FFFFFF" style={{ marginLeft: 0.5 }} />
                </View>
              }
            />
          </View>

          <View
            style={{
              width: 150,
              justifyContent: "flex-end",
              alignItems: "flex-end",
              zIndex: 1,
            }}
          >
            <Image
              source={walkerArt}
              style={{
                width: 160,
                height: 160,
                marginBottom: -4,
                marginRight: -8,
              }}
              contentFit="contain"
              accessibilityLabel={`Illustration of walking ${petName}`}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
