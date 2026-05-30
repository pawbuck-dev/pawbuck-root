import { PawthonWalkRouteGraphic } from "@/components/pawthon/PawthonWalkRouteGraphic";
import { getPawthonSurfaceTokens } from "@/components/pawthon/pawthonSurfaceTokens";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import {
  buildWalkShareHighlightLine,
  buildWalkShareStats,
  formatWalkShareDateLine,
  WALK_SHARE_CARD_HEIGHT,
  WALK_SHARE_CARD_WIDTH,
  type WalkSharePayload,
} from "@/utils/walkShareCard";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";

export type PawthonWalkShareCardProps = {
  payload: WalkSharePayload;
  /** Override dimensions (default story 360×640). */
  width?: number;
  height?: number;
};

const ROUTE_HERO_RATIO = 0.52;

export const PawthonWalkShareCard = React.forwardRef<View, PawthonWalkShareCardProps>(
  function PawthonWalkShareCard({ payload, width = WALK_SHARE_CARD_WIDTH, height = WALK_SHARE_CARD_HEIGHT }, ref) {
    const { mode, theme } = useTheme();
    const isDark = mode === "dark";
    const surfaces = getPawthonSurfaceTokens(isDark, theme);
    const stats = buildWalkShareStats(payload);
    const highlight = buildWalkShareHighlightLine(payload);
    const dateLine = formatWalkShareDateLine(payload.endedAt);
    const routeHeight = Math.round(height * ROUTE_HERO_RATIO);

    const skyColors = isDark
      ? (["#1A2830", "#243038", "#2A3A44"] as const)
      : (["#F5FAFF", "#E3F2FD", "#D6EBFA"] as const);

    const statChipBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)";
    const textPrimary = isDark ? "#F5F7FA" : "#1A2830";
    const textSecondary = isDark ? "#A8B4BE" : "#5A6B75";

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width,
          height,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[...skyColors]}
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isDark ? "rgba(38,193,193,0.25)" : "rgba(38,193,193,0.18)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="footsteps" size={18} color={PAWTHON_TEAL} />
            </View>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 15, color: textPrimary }}>
              PawBuck Pawthon
            </Text>
          </View>

          <View
            style={{
              height: routeHeight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <PawthonWalkRouteGraphic path={payload.path} width={width - 48} height={routeHeight - 16} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            {payload.petPhotoUrl ? (
              <Image
                source={{ uri: payload.petPhotoUrl }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  marginRight: 12,
                  backgroundColor: surfaces.iconBadgeBackground,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="paw" size={22} color={PAWTHON_TEAL} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: textPrimary }}>
                Walk with {payload.petName}
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: textSecondary, marginTop: 2 }}>
                {dateLine}
              </Text>
            </View>
            {payload.verificationPhotoUri ? (
              <Image
                source={{ uri: payload.verificationPhotoUri }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
                contentFit="cover"
              />
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {[
              { value: stats.distance, label: "mi" },
              { value: stats.duration, label: "Duration" },
              { value: stats.pace, label: "/mi" },
            ].map((chip) => (
              <View
                key={chip.label}
                style={{
                  flex: 1,
                  backgroundColor: statChipBg,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: textPrimary }}>
                  {chip.value}
                </Text>
                <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: textSecondary, marginTop: 2 }}>
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>

          {highlight ? (
            <View
              style={{
                backgroundColor: isDark ? "rgba(255,240,232,0.12)" : "#FFF0E8",
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: isDark ? "#FFD4B8" : "#5D4037" }}>
                {highlight}
              </Text>
            </View>
          ) : null}

          <View style={{ flex: 1, minHeight: 8 }} />

          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 11,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            pawbuck.app
          </Text>
        </LinearGradient>
      </View>
    );
  }
);
