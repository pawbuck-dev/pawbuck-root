import BottomNavBar from "@/components/home/BottomNavBar";
import PetSelector from "@/components/home/PetSelector";
import PremiumFeatureLocked from "@/components/subscription/PremiumFeatureLocked";
import { MiloJournalBar } from "@/components/petJournal/MiloJournalBar";
import {
  JOURNAL_DOMAIN_LABEL,
  subtypeLabel,
  type JournalDomain,
} from "@/constants/petJournal";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import type { PetJournalEntry } from "@/services/petJournal";
import { fetchJournalEntries } from "@/services/petJournal";
import type { PetLogEntry } from "@/types/petLog";
import { loadPetLogsForPet } from "@/utils/miloJournalStorage";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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

type TimelineRow =
  | { kind: "server"; entry: PetJournalEntry }
  | { kind: "milo"; entry: PetLogEntry };

export default function PetJournalScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { canAccessFeature, isLoading: subLoading, ensurePremium } = useSubscription();
  const canUseJournal = canAccessFeature("pet_journal");
  const { pets, loadingPets } = usePets();
  const { petId: petIdParam } = useLocalSearchParams<{ petId?: string }>();
  const [miloLogs, setMiloLogs] = useState<PetLogEntry[]>([]);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [domain, setDomain] = useState<JournalDomain>("health");

  useEffect(() => {
    if (petIdParam && pets.some((p) => p.id === petIdParam)) {
      setSelectedPetId(petIdParam);
    }
  }, [petIdParam, pets]);

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

  const mergedRows: TimelineRow[] = useMemo(() => {
    const serverRows: TimelineRow[] = entries.map((e) => ({ kind: "server", entry: e }));
    const miloRows: TimelineRow[] = miloLogs
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

  const openBriefing = () => {
    if (!selectedPetId) return;
    ensurePremium(
      () =>
        router.push({
          pathname: "/(home)/pet-journal/briefing",
          params: { petId: selectedPetId },
        } as any),
      "pet_journal_briefing_button"
    );
  };

  if (subLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background, justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!canUseJournal) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <PremiumFeatureLocked
          title="Pet Journal"
          onGoBack={() => router.back()}
          feature="pet_journal_screen"
        />
        <BottomNavBar activeTab="profile" />
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
          paddingBottom: 12,
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
              backgroundColor: isDark ? theme.card : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.foreground} />
          </TouchableOpacity>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(59,208,210,0.2)" : "rgba(59,208,210,0.2)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="book-outline" size={24} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground }}>
              Pet Journal
            </Text>
            <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
              Health, behavior & environment
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
          <View style={{ marginBottom: 14 }}>
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              onSelectPet={setSelectedPetId}
            />
          </View>
        )}

        <View
          style={{
            flexDirection: "row",
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            borderRadius: 14,
            padding: 4,
            gap: 4,
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
                  backgroundColor: active
                    ? isDark
                      ? theme.card
                      : "#FFFFFF"
                    : "transparent",
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

        {selectedPetId && pets.find((p) => p.id === selectedPetId) && (
          <MiloJournalBar pet={pets.find((p) => p.id === selectedPetId)!} domain={domain} />
        )}
      </View>

      {loadingPets || !selectedPetId ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={mergedRows}
          keyExtractor={(item) =>
            item.kind === "server" ? item.entry.id : `milo-${item.entry.id}`
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 120,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={theme.primary} />
            ) : (
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 32,
                  color: theme.secondary,
                  fontSize: 15,
                }}
              >
                No entries yet. Tell Milo above or use Manual entry.
              </Text>
            )
          }
          renderItem={({ item }) => {
            if (item.kind === "milo") {
              const e = item.entry;
              const sevColor =
                e.severity === "urgent"
                  ? "#b91c1c"
                  : e.severity === "high"
                    ? "#c2410c"
                    : e.severity === "medium"
                      ? "#b45309"
                      : "#15803d";
              return (
                <View
                  style={{
                    backgroundColor: isDark ? theme.card : "#FFFFFF",
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <Ionicons name="sparkles" size={20} color={theme.primary} />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          letterSpacing: 0.5,
                          color: theme.secondary,
                        }}
                      >
                        MILO · {e.severity.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: theme.secondary }}>
                      {e.created_at.slice(0, 10)}
                    </Text>
                  </View>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: `${sevColor}22`,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: sevColor }}>
                      {e.severity}
                    </Text>
                  </View>
                  {e.note ? (
                    <Text style={{ fontSize: 15, color: theme.foreground, lineHeight: 22 }}>{e.note}</Text>
                  ) : null}
                </View>
              );
            }
            const journal = item.entry;
            return (
              <View
                style={{
                  backgroundColor: isDark ? theme.card : "#FFFFFF",
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons
                      name={domainIcon(journal.domain as JournalDomain)}
                      size={20}
                      color={theme.primary}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        letterSpacing: 0.5,
                        color: theme.secondary,
                      }}
                    >
                      {subtypeLabel(journal.domain as JournalDomain, journal.subtype).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.secondary }}>{journal.entry_date}</Text>
                </View>
                {journal.vet_flagged && (
                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: "rgba(249,115,22,0.15)",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#C2410C" }}>Vet</Text>
                  </View>
                )}
                {journal.note ? (
                  <Text style={{ fontSize: 15, color: theme.foreground, lineHeight: 22 }}>
                    {journal.note}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <BottomNavBar activeTab="profile" />
    </View>
  );
}
