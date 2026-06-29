import type { CareNudge } from "@pawbuck/care-nudges";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type CareNudgeListItem = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  route: string;
};

type Props = {
  nudges: CareNudgeListItem[];
  onDismiss: (nudge: CareNudgeListItem) => void;
};

export function careNudgeToListItem(nudge: CareNudge): CareNudgeListItem {
  return {
    id: nudge.dedupeKey,
    kind: nudge.kind,
    title: nudge.title,
    subtitle: nudge.body,
    route: nudge.deepLink,
  };
}

export default function CareNudgeTodayList({ nudges, onDismiss }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();

  if (nudges.length === 0) return null;

  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.secondary }}>
        Today&apos;s care reminders
      </Text>
      {nudges.map((item) => (
        <View
          key={item.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 12,
            backgroundColor: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.08)",
            gap: 10,
          }}
        >
          <Pressable
            style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}
            onPress={() => router.push(item.route as any)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <Ionicons name="medkit-outline" size={18} color="#EA580C" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.foreground }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.secondary} />
          </Pressable>
          <Pressable
            onPress={() => onDismiss(item)}
            accessibilityRole="button"
            accessibilityLabel={`Snooze ${item.title} for 7 days`}
            hitSlop={8}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            }}
          >
            <Ionicons name="close" size={16} color={theme.secondary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
