import type { JournalDomain } from "@/constants/petJournal";
import type { Pet } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { fetchAllJournalEntriesForPet } from "@/services/petJournal";
import {
  countEntriesInWindow,
  formatJournalEntryCountLabel,
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
  ScrollView,
  Text,
  View,
} from "react-native";

const ENTRY_WINDOW_DAYS = 7;

type QuickChip = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
};

type Props = {
  pet: Pet;
};

export default function PetJournalHomeCard({ pet }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { ensurePremium } = useSubscription();

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
  const entryCountLabel = useMemo(
    () => formatJournalEntryCountLabel(recentCount, ENTRY_WINDOW_DAYS),
    [recentCount]
  );

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };

  const withPremium = useCallback(
    (fn: () => void) => ensurePremium(fn, "pet_journal_home_row"),
    [ensurePremium]
  );

  const openJournal = useCallback(
    (params?: { focusEntryId?: string }) => {
      withPremium(() =>
        router.push({
          pathname: "/(home)/pet-journal",
          params: {
            petId: pet.id,
            ...(params?.focusEntryId ? { focusEntryId: params.focusEntryId, focusKind: "server" } : {}),
          },
        } as any)
      );
    },
    [pet.id, router, withPremium]
  );

  const openNewEntry = useCallback(
    (domain: JournalDomain, subtype: string) => {
      withPremium(() =>
        router.push({
          pathname: "/(home)/pet-journal/new",
          params: { petId: pet.id, domain, subtype },
        } as any)
      );
    },
    [pet.id, router, withPremium]
  );

  const quickChips: QuickChip[] = useMemo(
    () => [
      {
        id: "symptom",
        label: "Symptom",
        icon: "medkit-outline",
        onPress: () => openNewEntry("health", "symptom"),
      },
      {
        id: "walk",
        label: "Walk",
        icon: "paw-outline",
        onPress: () => withPremium(() => router.push("/pawthon-walk" as any)),
      },
      {
        id: "meal",
        label: "Meal",
        icon: "restaurant-outline",
        onPress: () => openNewEntry("health", "diet"),
      },
      {
        id: "behavior",
        label: "Behavior",
        icon: "happy-outline",
        onPress: () => openNewEntry("behavioral", "anxious"),
      },
      {
        id: "photo",
        label: "Photo",
        icon: "camera-outline",
        onPress: () => openNewEntry("health", "other"),
      },
    ],
    [openNewEntry, router, withPremium]
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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>
            {pet.name}&apos;s Journal
          </Text>
          {isPending ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 6, alignSelf: "flex-start" }} />
          ) : entries.length === 0 ? (
            <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
              Start logging health, walks, and behavior
            </Text>
          ) : null}
        </View>
        {!isPending && entries.length > 0 ? (
          <Pressable
            onPress={() => openJournal()}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            accessibilityRole="button"
            accessibilityLabel={`View journal, ${entryCountLabel}`}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary }}>{entryCountLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => openJournal()}
          hitSlop={8}
          style={{ marginLeft: 8, padding: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Open journal menu"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.secondary} />
        </Pressable>
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
                {formatLatestEntryTitle(latestEntry.note)}
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
          Add a symptom, walk, or meal — Milo and your Health Briefing use what you log here.
        </Text>
      ) : null}

      <Pressable
        onPress={() =>
          withPremium(() =>
            router.push({
              pathname: "/(home)/milo",
              params: { pet: pet.id, journalDomain: "health" },
            } as any)
          )
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
          marginBottom: 14,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
        }}
        accessibilityRole="button"
        accessibilityLabel={`Tell Milo what's happening with ${pet.name}`}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
        <Text style={{ flex: 1, fontSize: 15, color: theme.secondary }}>
          Tell Milo what&apos;s happening with {pet.name}…
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.primary} />
      </Pressable>

      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: theme.secondary,
          letterSpacing: 0.6,
          marginBottom: 8,
        }}
      >
        QUICK LOG
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {quickChips.map((chip, index) => (
          <Pressable
            key={chip.id}
            onPress={chip.onPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor:
                index === 0
                  ? theme.primary
                  : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${chip.label}`}
          >
            <Ionicons
              name={chip.icon}
              size={16}
              color={index === 0 ? theme.primaryForeground : theme.foreground}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: index === 0 ? theme.primaryForeground : theme.foreground,
              }}
            >
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
