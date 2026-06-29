import JournalEntryShortcuts from "@/components/petJournal/JournalEntryShortcuts";
import CareNudgeTodayList from "@/components/home/CareNudgeTodayList";
import { useTheme } from "@/context/themeContext";
import type { HomeCareNudgeItem, HomeTodaySnapshot } from "@/utils/homeTodaySnapshot";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

type Props = {
  petId: string;
  petName: string;
  snapshot: HomeTodaySnapshot;
  careNudges?: HomeCareNudgeItem[];
  onDismissCareNudge?: (nudgeKind: string) => void;
  onCheckInWithMilo: () => void;
  aiJournalEntriesRemaining?: number | null;
  aiJournalEntriesUsed?: number;
};

export default function HomeMiloDepthCard({
  petId,
  petName,
  snapshot,
  careNudges = [],
  onDismissCareNudge,
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

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        padding: 16,
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
        ...borderStyle,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.secondary, marginBottom: 4 }}>
        When something's up
      </Text>
      <Text style={{ fontSize: 14, color: theme.secondary, lineHeight: 20, marginBottom: 14 }}>
        {`Milo asks follow-ups from ${petName}'s record — optional any day.`}
      </Text>

      {careNudges.length > 0 && onDismissCareNudge ? (
        <CareNudgeTodayList
          nudges={careNudges}
          onDismiss={(item) => onDismissCareNudge(item.kind)}
        />
      ) : null}

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
            marginBottom: 12,
          }}
          accessibilityRole="button"
          accessibilityLabel={snapshot.priority.title}
        >
          <Ionicons name="heart" size={18} color="#EA580C" />
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

      <Pressable
        onPress={onCheckInWithMilo}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.primary,
          backgroundColor: isDark ? "rgba(56,189,189,0.08)" : "rgba(59,208,210,0.08)",
        }}
        accessibilityRole="button"
        accessibilityLabel={`Check in with Milo about ${petName}`}
      >
        <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.primary }}>
          Check in with Milo
        </Text>
      </Pressable>

      <JournalEntryShortcuts petId={petId} />

      {showAiJournalQuota ? (
        <Text style={{ fontSize: 11, color: theme.secondary, textAlign: "center", marginTop: 10 }}>
          {aiJournalEntriesRemaining} AI check-in{aiJournalEntriesRemaining === 1 ? "" : "s"} left on Free
        </Text>
      ) : null}
    </View>
  );
}
