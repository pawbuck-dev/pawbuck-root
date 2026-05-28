import { PawthonHubWalkLogSection } from "@/components/pawthon/PawthonHubWalkLogSection";
import { PawthonStreakBanner } from "@/components/pawthon/PawthonStreakBanner";
import { PawthonTrophyIllustration } from "@/components/pawthon/PawthonTrophyIllustration";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { formatWeeklyWalkerRankLine } from "@/services/walkSessions";
import type { WalkSessionRow } from "@/services/walkSessions";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export type PawthonHubContentProps = {
  petName: string;
  walkCount: number;
  totalMiles: number;
  petsCount: number;
  weekKm: number;
  weekWalkCount: number;
  streakDays: number;
  todayMeters: number;
  recentWalks: WalkSessionRow[];
  rankLabel?: string;
  showWeeklyChallenge?: boolean;
  onStartWalk: () => void;
  onBack: () => void;
  onSeeWalkLog: () => void;
  onWalkPress: (sessionId: string) => void;
  onWeeklyPress: () => void;
  onBadgesPress: () => void;
  onRemindersPress: () => void;
};

function StatCard(props: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
  glowColors: [string, string];
  isDark: boolean;
  themeCard: string;
  themeBorder: string;
  themeFg: string;
  themeMuted: string;
}) {
  const { icon, value, label, glowColors, isDark, themeCard, themeBorder, themeFg, themeMuted } = props;
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 20,
        backgroundColor: themeCard,
        borderWidth: 1,
        borderColor: themeBorder,
        paddingVertical: 16,
        paddingHorizontal: 10,
        overflow: "hidden",
        minHeight: 118,
      }}
    >
      <LinearGradient
        colors={glowColors}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.8 }}
        style={{
          position: "absolute",
          right: -20,
          top: -20,
          width: 80,
          height: 80,
          borderRadius: 40,
          opacity: isDark ? 0.15 : 0.35,
        }}
      />
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={20} color={themeFg} />
      </View>
      <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 22, color: themeFg }}>{value}</Text>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: themeMuted, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Pawthon landing: weekly challenge hero, 3 stat tiles, Start a Walk (Figma walker hub).
 */
export function PawthonHubContent({
  petName,
  walkCount,
  totalMiles,
  petsCount,
  weekKm,
  weekWalkCount,
  streakDays,
  todayMeters,
  recentWalks,
  rankLabel = formatWeeklyWalkerRankLine(null, 0),
  showWeeklyChallenge = true,
  onStartWalk,
  onBack,
  onSeeWalkLog,
  onWalkPress,
  onWeeklyPress,
  onBadgesPress,
  onRemindersPress,
}: PawthonHubContentProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const creamBg = (
    isDark
      ? (["#2A2622", "#1E1C1A", "#252220"] as const)
      : (["#FFFDF8", "#FAF3E8", "#FFF9F0"] as const)
  );
  const sunburstRay = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)";
  const labelColor = isDark ? "rgba(255,255,255,0.55)" : "#1A1A1A";
  const titleColor = isDark ? "#FFFFFF" : "#0D0F0F";
  const subColor = isDark ? "rgba(255,255,255,0.65)" : "#5A5F6A";
  const milesStr = totalMiles < 10 ? totalMiles.toFixed(1) : totalMiles.toFixed(0);
  const walksStr = walkCount > 999 ? "999+" : String(walkCount);
  const petsStr = String(petsCount);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            marginRight: 40,
            fontFamily: "Poppins_600SemiBold",
            fontSize: 17,
            color: theme.foreground,
          }}
        >
          Walk with {petName}
        </Text>
      </View>

      {showWeeklyChallenge ? (
      <Pressable onPress={onWeeklyPress}>
        <LinearGradient
          colors={creamBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            overflow: "hidden",
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent",
            marginBottom: 20,
          }}
        >
          <View
            style={{
              position: "absolute",
              right: -40,
              top: "12%",
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
              right: 16,
              bottom: -24,
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
              alignItems: "stretch",
              justifyContent: "space-between",
              paddingVertical: 20,
              paddingLeft: 20,
              paddingRight: 10,
              minHeight: 148,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 0,
                paddingRight: 10,
                zIndex: 2,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 11,
                  letterSpacing: 1.2,
                  color: labelColor,
                  marginBottom: 6,
                }}
              >
                WEEKLY CHALLENGE
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
                Walker Marathon
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins_500Medium",
                  fontSize: 14,
                  lineHeight: 20,
                  color: subColor,
                }}
              >
                {rankLabel}
              </Text>
            </View>

            <PawthonTrophyIllustration size={152} />
          </View>
        </LinearGradient>
      </Pressable>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <StatCard
          icon="walk"
          value={walksStr}
          label="Walks"
          glowColors={["#E3F2FD", "#BBDEFB"]}
          isDark={isDark}
          themeCard={theme.card}
          themeBorder={theme.border}
          themeFg={theme.foreground}
          themeMuted={theme.secondary}
        />
        <StatCard
          icon="bar-chart"
          value={milesStr}
          label="Miles"
          glowColors={["#FFE0B2", "#FFCC80"]}
          isDark={isDark}
          themeCard={theme.card}
          themeBorder={theme.border}
          themeFg={theme.foreground}
          themeMuted={theme.secondary}
        />
        <StatCard
          icon="paw"
          value={petsStr}
          label="Pets"
          glowColors={["#C8E6C9", "#A5D6A7"]}
          isDark={isDark}
          themeCard={theme.card}
          themeBorder={theme.border}
          themeFg={theme.foreground}
          themeMuted={theme.secondary}
        />
      </View>

      <PawthonStreakBanner
        petName={petName}
        streakDays={streakDays}
        todayMeters={todayMeters}
        onPress={onStartWalk}
      />

      <PawthonHubWalkLogSection
        petName={petName}
        walks={recentWalks}
        onSeeAll={onSeeWalkLog}
        onWalkPress={onWalkPress}
      />

      <View style={{ flexDirection: "row", gap: 16, marginBottom: 20, justifyContent: "center" }}>
        <Pressable onPress={onBadgesPress} hitSlop={8}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: theme.primary }}>Badges</Text>
        </Pressable>
        <Text style={{ color: theme.secondary }}>·</Text>
        <Pressable onPress={onRemindersPress} hitSlop={8}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: theme.primary }}>Reminders</Text>
        </Pressable>
      </View>

      <Pressable onPress={onStartWalk}>
        <LinearGradient
          colors={[PAWTHON_TEAL, "#1FA8A8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 16,
            borderRadius: 28,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: "#FFFFFF" }}>Start a Walk</Text>
        </LinearGradient>
      </Pressable>
      </ScrollView>
    </View>
  );
}
