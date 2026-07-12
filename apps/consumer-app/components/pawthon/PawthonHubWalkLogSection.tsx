import { PawthonWalkLogRow } from "@/components/pawthon/PawthonWalkLogRow";
import { getPawthonSurfaceTokens } from "@/components/pawthon/pawthonSurfaceTokens";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { useWalkerDisplayNames } from "@/hooks/useWalkerDisplayNames";
import type { WalkSessionRow } from "@/services/walkSessions";
import {
  formatWalkDistanceDuration,
  formatWalkLogDate,
  formatWalkPace,
} from "@/utils/pawthonWalkDisplay";
import { formatMiles, metersToMiles } from "@/constants/pawthonUi";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

export type PawthonHubWalkLogSectionProps = {
  petName: string;
  walks: WalkSessionRow[];
  onSeeAll: () => void;
  onWalkPress: (sessionId: string) => void;
};

export function PawthonHubWalkLogSection({
  petName,
  walks,
  onSeeAll,
  onWalkPress,
}: PawthonHubWalkLogSectionProps) {
  const { theme, mode } = useTheme();
  const { user } = useAuth();
  const isDark = mode === "dark";
  const surfaces = getPawthonSurfaceTokens(isDark, theme);
  const borderStyle =
    Platform.OS === "android"
      ? {}
      : { borderWidth: 1 as const, borderColor: surfaces.borderColor };

  const preview = walks.slice(0, 2);
  const walkerIds = preview.map((w) => w.user_id);
  const { data: walkerNames } = useWalkerDisplayNames(walkerIds);

  return (
    <View
      style={{
        backgroundColor: surfaces.cardBackground,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 20,
        ...borderStyle,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: surfaces.iconBadgeBackground,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="footsteps" size={20} color={theme.primary} />
        </View>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: theme.foreground }}>Walk log</Text>
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary }}>See all</Text>
        </Pressable>
      </View>

      {preview.length === 0 ? (
        <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 19 }}>
          No walks logged yet — your routes appear here after each walk with {petName}.
        </Text>
      ) : (
        <View>
          {preview.map((w, i) => (
            <View key={w.id}>
              {i > 0 ? (
                <View style={{ height: 1, backgroundColor: surfaces.borderColor, marginLeft: 76 }} />
              ) : null}
              <PawthonWalkLogRow
                dateLabel={formatWalkLogDate(w.started_at)}
                petName={petName}
                walkerName={
                  w.user_id === user?.id ? "You" : walkerNames?.get(w.user_id) ?? null
                }
                distanceMi={formatMiles(metersToMiles(Number(w.distance_meters)))}
                durationLabel={formatWalkDistanceDuration(w).split(" · ")[1] ?? ""}
                paceLabel={formatWalkPace(w)}
                distanceMeters={Number(w.distance_meters)}
                onPress={() => onWalkPress(w.id)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
