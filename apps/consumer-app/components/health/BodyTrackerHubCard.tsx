import {
  dashboardCareTeamCardChrome,
} from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import {
  healthRecordBodyTrackerHref,
  type BodyTrackerSegment,
} from "@/utils/healthRecordNavigation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

type Props = {
  petId: string;
  /** Deep link segment when opening from Home long-press, etc. */
  initialSegment?: BodyTrackerSegment;
};

export default function BodyTrackerHubCard({ petId, initialSegment = "weight" }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const cardChrome = dashboardCareTeamCardChrome(isDark);

  return (
    <Pressable
      onPress={() => router.push(healthRecordBodyTrackerHref(petId, initialSegment) as any)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        backgroundColor: cardChrome.backgroundColor,
        gap: 12,
        ...(Platform.OS === "android"
          ? {}
          : {
              borderWidth: cardChrome.borderWidth,
              borderColor: cardChrome.borderColor,
            }),
      }}
      accessibilityRole="button"
      accessibilityLabel="Open body and daily habits tracker"
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: isDark ? "rgba(56, 189, 189, 0.2)" : "rgba(59, 208, 210, 0.18)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="pulse-outline" size={22} color={theme.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>
          Body & daily habits
        </Text>
        <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 3 }} numberOfLines={2}>
          Weight trends, intake targets, output photos & tags
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
    </Pressable>
  );
}
