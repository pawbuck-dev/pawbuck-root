import type { JournalDomain } from "@/constants/petJournal";
import type { Pet } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { fetchAllJournalEntriesForPet } from "@/services/petJournal";
import {
  countEntriesInWindow,
  formatJournalViewAllLabel,
  formatLastEntryMeta,
  formatLatestEntrySubtitle,
  formatLatestEntryTitle,
} from "@/utils/journalContinuity";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

const ENTRY_WINDOW_DAYS = 7;

type JournalShortcut = {
  id: string;
  label: string;
  onPress: () => void;
};

type Props = {
  pet: Pet;
};

export default function PetJournalHomeCard({ pet }: Props) {
  const { theme, mode } = useTheme();
  const { aiJournalEntriesRemaining } = useSubscription();
  const isDark = mode === "dark";
  const router = useRouter();

  const { data: entries = [], isPending } = useQuery({
    queryKey: ["pet_journal_home", pet.id],
    queryFn: () => fetchAllJournalEntriesForPet(pet.id),
    enabled: !!pet.id,
  });

  const latestEntry = entries[0];
  const recentCount = useMemo(
    () => countEntriesInWindow(entries, ENTRY_WINDOW_DAYS),
    [entries]
  );
  const viewAllLabel = useMemo(
    () => formatJournalViewAllLabel(recentCount, ENTRY_WINDOW_DAYS),
    [recentCount]
  );

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };

  const openJournal = useCallback(
    (params?: { focusEntryId?: string }) => {
      router.push({
        pathname: "/(home)/pet-journal",
        params: {
          petId: pet.id,
          ...(params?.focusEntryId ? { focusEntryId: params.focusEntryId, focusKind: "server" } : {}),
        },
      } as any);
    },
    [pet.id, router]
  );

  const openMiloCheckIn = useCallback(() => {
    router.push({
      pathname: "/(home)/pet-journal",
      params: { petId: pet.id, domain: "health" },
    } as any);
  }, [pet.id, router]);

  const openNewEntry = useCallback(
    (domain: JournalDomain, subtype: string) => {
      router.push({
        pathname: "/(home)/pet-journal/new",
        params: { petId: pet.id, domain, subtype },
      } as any);
    },
    [pet.id, router]
  );

  const journalShortcuts: JournalShortcut[] = useMemo(
    () => [
      { id: "symptom", label: "Symptom", onPress: () => openNewEntry("health", "symptom") },
      { id: "appetite", label: "Appetite", onPress: () => openNewEntry("health", "diet") },
      { id: "mood", label: "Mood", onPress: () => openNewEntry("health", "mood") },
      { id: "more", label: "More", onPress: () => openJournal() },
    ],
    [openJournal, openNewEntry]
  );

  const needsAttention = latestEntry ? journalEntryNeedsTriageAttention(latestEntry) : false;

  return (
    <View
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        ...borderStyle,
      }}
    >
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? "rgba(56, 189, 189, 0.2)" : "rgba(59, 208, 210, 0.18)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="sparkles" size={20} color={theme.primary} />
          </View>
          <Text
            style={{ flex: 1, fontSize: 16, fontWeight: "700", color: theme.foreground }}
            numberOfLines={1}
          >
            {pet.name}&apos;s Journal
          </Text>
          {isPending ? <ActivityIndicator size="small" color={theme.primary} /> : null}
        </View>
        {!isPending ? (
          <Pressable
            onPress={() => openJournal()}
            hitSlop={8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-end",
              gap: 2,
              marginTop: 4,
            }}
            accessibilityRole="button"
            accessibilityLabel={`View all journal entries, ${viewAllLabel}`}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary }}>{viewAllLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </Pressable>
        ) : null}
      </View>

      {latestEntry ? (
        <Pressable
          onPress={() => openJournal({ focusEntryId: latestEntry.id })}
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            borderRadius: 14,
            padding: 12,
            marginBottom: 14,
          }}
          accessibilityRole="button"
          accessibilityLabel="View latest journal entry"
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {needsAttention ? (
              <Ionicons
                name="warning"
                size={18}
                color="#F59E0B"
                style={{ marginRight: 8, marginTop: 2 }}
              />
            ) : (
              <Ionicons
                name="document-text-outline"
                size={18}
                color={theme.secondary}
                style={{ marginRight: 8, marginTop: 2 }}
              />
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.secondary,
                  letterSpacing: 0.6,
                  marginBottom: 4,
                }}
              >
                {`LAST ENTRY · ${formatLastEntryMeta(latestEntry.entry_date)}`}
              </Text>
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, lineHeight: 20 }}
                numberOfLines={2}
              >
                {formatLatestEntryTitle(latestEntry.note, 80, pet.name)}
              </Text>
              <Text
                style={{ fontSize: 12, color: theme.secondary, marginTop: 4, lineHeight: 17 }}
                numberOfLines={1}
              >
                {formatLatestEntrySubtitle(latestEntry)}
              </Text>
            </View>
          </View>
        </Pressable>
      ) : !isPending ? (
        <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 14, lineHeight: 19 }}>
          Notes help Milo and your Health Briefing understand day-to-day changes.
        </Text>
      ) : null}

      <Pressable
        onPress={openMiloCheckIn}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 14,
          backgroundColor: theme.primary,
          marginBottom: 14,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Check in with Milo about ${pet.name}`}
      >
        <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primaryForeground }}>
          Check in with Milo
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.primaryForeground} />
      </Pressable>
      {aiJournalEntriesRemaining != null ? (
        <Text
          style={{
            fontSize: 12,
            color: theme.secondary,
            textAlign: "center",
            marginTop: -8,
            marginBottom: 14,
          }}
        >
          {aiJournalEntriesRemaining} AI check-in{aiJournalEntriesRemaining === 1 ? "" : "s"} left on Free
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
        accessibilityRole="toolbar"
        accessibilityLabel="Add journal entry shortcuts"
      >
        {journalShortcuts.map((shortcut, index) => (
          <React.Fragment key={shortcut.id}>
            {index > 0 ? (
              <Text style={{ fontSize: 13, color: theme.secondary, paddingHorizontal: 2 }}>·</Text>
            ) : null}
            <Pressable
              onPress={shortcut.onPress}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Add ${shortcut.label}`}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>
                {shortcut.label}
              </Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
