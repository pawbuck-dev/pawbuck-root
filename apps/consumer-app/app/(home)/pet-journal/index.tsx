import BottomNavBar from "@/components/home/BottomNavBar";
import PetSelector from "@/components/home/PetSelector";
import { JournalNoteText } from "@/components/journal/JournalNoteText";
import TodayHabitPanel from "@/components/home/TodayHabitPanel";
import { PetJournalCaptureSection } from "@/components/petJournal/PetJournalCaptureSection";
import { PetJournalHistorySection } from "@/components/petJournal/PetJournalHistorySection";
import type { PetJournalTimelineRow } from "@/components/petJournal/PetJournalEntryCard";
import { getJournalSurfaceTokens } from "@/components/petJournal/journalSurfaceTokens";
import {
  JOURNAL_DOMAIN_LABEL,
  subtypeLabel,
  type JournalDomain,
} from "@/constants/petJournal";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { useUnifiedPetNotificationCounts } from "@/hooks/useUnifiedPetNotificationCounts";
import {
  behaviorBaselineQueryKey,
  getBaselineContext,
} from "@/services/behaviorBaseline";
import { fetchJournalEntries, fetchTransferHighlightEntries } from "@/services/petJournal";
import { loadPetLogsForPet } from "@/utils/miloJournalStorage";
import type { PetLogEntry } from "@/types/petLog";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DOMAINS: JournalDomain[] = ["health", "behavioral", "environmental"];

function domainIcon(d: JournalDomain): React.ComponentProps<typeof Ionicons>["name"] {
  if (d === "health") return "medkit-outline";
  if (d === "behavioral") return "paw-outline";
  return "globe-outline";
}

export default function PetJournalScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getJournalSurfaceTokens(isDark, theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isLoading: subLoading } = useSubscription();
  const { pets, loadingPets } = usePets();
  const { petId: petIdParam, focusEntryId, focusKind, domain: domainParam } = useLocalSearchParams<{
    petId?: string;
    focusEntryId?: string;
    focusKind?: string;
    domain?: string;
  }>();
  const [miloLogs, setMiloLogs] = useState<PetLogEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [domain, setDomain] = useState<JournalDomain>("health");
  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId]
  );
  const notificationCounts = useUnifiedPetNotificationCounts();

  useEffect(() => {
    if (petIdParam && pets.some((p) => p.id === petIdParam)) {
      setSelectedPetId(petIdParam);
    }
  }, [petIdParam, pets]);

  useEffect(() => {
    if (!domainParam) return;
    const d = domainParam as JournalDomain;
    if (DOMAINS.includes(d)) setDomain(d);
  }, [domainParam]);

  useEffect(() => {
    if (!selectedPetId && pets.length > 0) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  const {
    data: entries = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["pet_journal", selectedPetId, domain],
    queryFn: () => fetchJournalEntries(selectedPetId!, domain),
    enabled: !!selectedPetId,
  });

  const { data: transferHighlights = [] } = useQuery({
    queryKey: ["pet_journal_transfer_highlights", selectedPetId],
    queryFn: () => fetchTransferHighlightEntries(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: behaviorBaseline = null } = useQuery({
    queryKey: behaviorBaselineQueryKey(selectedPetId),
    queryFn: () => getBaselineContext(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const openBaseline = () => {
    if (!selectedPetId) return;
    router.push({
      pathname: "/(home)/pet-journal/behavior-baseline",
      params: { petId: selectedPetId },
    } as any);
  };

  const onRefresh = useCallback(() => {
    void refetch();
    if (user?.id && selectedPetId) {
      void loadPetLogsForPet(user.id, selectedPetId).then(setMiloLogs);
    }
  }, [refetch, user?.id, selectedPetId]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id && selectedPetId) {
        void loadPetLogsForPet(user.id, selectedPetId).then(setMiloLogs);
      }
    }, [user?.id, selectedPetId])
  );

  const mergedRows: PetJournalTimelineRow[] = useMemo(() => {
    const serverRows: PetJournalTimelineRow[] = entries.map((e) => ({ kind: "server", entry: e }));
    const miloRows: PetJournalTimelineRow[] = miloLogs
      .filter((e) => e.domain === domain && e.pet_id === selectedPetId)
      .map((e) => ({ kind: "milo", entry: e }));
    const all = [...serverRows, ...miloRows];
    all.sort((a, b) => {
      const ta =
        a.kind === "server"
          ? `${a.entry.entry_date}T${a.entry.created_at?.slice(11) ?? "00:00:00"}`
          : a.entry.created_at;
      const tb =
        b.kind === "server"
          ? `${b.entry.entry_date}T${b.entry.created_at?.slice(11) ?? "00:00:00"}`
          : b.entry.created_at;
      return tb.localeCompare(ta);
    });
    return all;
  }, [entries, miloLogs, domain, selectedPetId]);

  useEffect(() => {
    if (!focusEntryId || !focusKind) return;
    const fid = String(focusEntryId);
    const fk = focusKind === "server" || focusKind === "milo" ? focusKind : null;
    if (!fk || mergedRows.length === 0) return;

    const idx = mergedRows.findIndex((row) => {
      if (fk === "server" && row.kind === "server") return row.entry.id === fid;
      if (fk === "milo" && row.kind === "milo") return row.entry.id === fid;
      return false;
    });
    if (idx < 0) return;

    if (idx > 0) setHistoryExpanded(true);
    setHighlightEntryId(fid);
    router.setParams({ focusEntryId: undefined, focusKind: undefined } as Record<string, undefined>);
  }, [focusEntryId, focusKind, mergedRows, router]);

  useEffect(() => {
    if (!highlightEntryId) return;
    const t = setTimeout(() => setHighlightEntryId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightEntryId]);

  const openBriefing = () => {
    if (!selectedPetId) return;
    router.push({
      pathname: "/(home)/pet-journal/briefing",
      params: { petId: selectedPetId },
    } as any);
  };

  const transferHighlightsNode =
    transferHighlights.length === 0 ? null : (
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 0.4,
            color: theme.secondary,
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Highlighted by previous owner
        </Text>
        {transferHighlights.map(({ entry, sort_order }) => (
          <Pressable
            key={entry.id}
            onPress={() => setDomain(entry.domain as JournalDomain)}
            style={{
              backgroundColor: surfaces.cardBackground,
              borderRadius: 16,
              padding: 16,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: surfaces.borderColor,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.secondary, marginBottom: 8 }}>
              #{sort_order} · {JOURNAL_DOMAIN_LABEL[entry.domain as JournalDomain]} ·{" "}
              {subtypeLabel(entry.domain as JournalDomain, entry.subtype)}
            </Text>
            {entry.note ? (
              <JournalNoteText
                text={entry.note}
                petName={selectedPet?.name}
                style={{ fontSize: 17, lineHeight: 25 }}
              />
            ) : null}
          </Pressable>
        ))}
      </View>
    );

  if (subLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background, justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: surfaces.insetBackground,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>
              Pet Journal
            </Text>
            <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
              Notes for Milo & your vet briefing
            </Text>
          </View>
          <TouchableOpacity
            onPress={openBriefing}
            disabled={!selectedPetId}
            accessibilityLabel="Open Health Briefing"
            style={{ padding: 8, opacity: selectedPetId ? 1 : 0.4 }}
          >
            <Ionicons name="sparkles-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {pets.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              onSelectPet={setSelectedPetId}
              notificationCounts={notificationCounts}
            />
          </View>
        )}

        <View
          style={{
            flexDirection: "row",
            backgroundColor: surfaces.insetBackground,
            borderRadius: 14,
            padding: 4,
            gap: 4,
            borderWidth: 1,
            borderColor: surfaces.borderColor,
          }}
        >
          {DOMAINS.map((d) => {
            const active = domain === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDomain(d)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: active ? surfaces.cardBackground : "transparent",
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? surfaces.borderColor : "transparent",
                }}
              >
                <Ionicons
                  name={domainIcon(d)}
                  size={16}
                  color={active ? theme.primary : theme.secondary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? theme.foreground : theme.secondary,
                  }}
                >
                  {JOURNAL_DOMAIN_LABEL[d]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loadingPets || !selectedPetId || !selectedPet ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 120,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          keyboardShouldPersistTaps="handled"
        >
          <TodayHabitPanel petId={selectedPet.id} embedded showDateHeader />

          <PetJournalCaptureSection pet={selectedPet} domain={domain} />

          <Pressable
            onPress={openBaseline}
            accessibilityLabel={behaviorBaseline ? "Edit behavior baseline" : "Set behavior baseline"}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              paddingVertical: 4,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Ionicons name="pulse-outline" size={16} color={theme.primary} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
                {behaviorBaseline ? "Behavior baseline saved" : "Set behavior baseline"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.secondary} />
          </Pressable>

          <PetJournalHistorySection
            rows={mergedRows}
            petName={selectedPet.name}
            expanded={historyExpanded}
            onToggle={() => setHistoryExpanded((v) => !v)}
            highlightEntryId={highlightEntryId}
            isLoading={isLoading}
            transferHighlights={transferHighlightsNode}
          />
        </ScrollView>
      )}

      <BottomNavBar activeTab="profile" />
    </View>
  );
}
