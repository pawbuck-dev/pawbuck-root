import JournalEntryShortcuts from "@/components/petJournal/JournalEntryShortcuts";
import { useTheme } from "@/context/themeContext";
import type { HomeTodaySnapshot } from "@/utils/homeTodaySnapshot";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

type Props = {
  petId: string;
  petName: string;
  snapshot: HomeTodaySnapshot;
  onCheckInWithMilo: () => void;
  aiJournalEntriesRemaining?: number | null;
  /** Hide free-tier quota until the user has completed at least one AI check-in. */
  aiJournalEntriesUsed?: number;
};

export default function HomeTodaySection({
  petId,
  petName,
  snapshot,
  onCheckInWithMilo,
  aiJournalEntriesRemaining,
  aiJournalEntriesUsed = 0,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();

  const showAiJournalQuota =
    aiJournalEntriesRemaining != null && aiJournalEntriesUsed > 0;

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };

  const statusColor = snapshot.statusTone === "ok" ? "#22C55E" : "#F97316";

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: theme.foreground,
          marginBottom: 4,
        }}
      >
        {`How's ${petName} today?`}
      </Text>
      <Text style={{ fontSize: 14, color: theme.secondary, marginBottom: 14, lineHeight: 20 }}>
        Milo interview for AI-guided notes · manual shortcuts below for quick logs.
      </Text>

      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          borderRadius: 20,
          padding: 16,
          ...borderStyle,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: statusColor,
            }}
          />
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground, flex: 1 }}>
            {snapshot.statusLabel}
          </Text>
        </View>

        <Pressable
          onPress={onCheckInWithMilo}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 15,
            paddingHorizontal: 16,
            borderRadius: 14,
            backgroundColor: theme.primary,
            marginBottom: snapshot.priority ? 12 : 0,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Check in with Milo about ${petName}`}
        >
          <Ionicons name="sparkles" size={18} color={theme.primaryForeground} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.primaryForeground }}>
            Check in with Milo
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.primaryForeground} />
        </Pressable>

        {snapshot.priority ? (
          <Pressable
            onPress={() => router.push(snapshot.priority!.route as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.08)",
              gap: 10,
            }}
            accessibilityRole="button"
            accessibilityLabel={snapshot.priority.title}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(249,115,22,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="heart" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.foreground }} numberOfLines={1}>
                {snapshot.priority.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }} numberOfLines={2}>
                {snapshot.priority.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.secondary} />
          </Pressable>
        ) : null}

        <JournalEntryShortcuts petId={petId} />

        {showAiJournalQuota ? (
          <Text
            style={{
              fontSize: 11,
              color: theme.secondary,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            {aiJournalEntriesRemaining} AI check-in{aiJournalEntriesRemaining === 1 ? "" : "s"} left on Free
          </Text>
        ) : null}
      </View>
    </View>
  );
}
