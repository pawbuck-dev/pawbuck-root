import { PawthonWalkLogRow } from "@/components/pawthon/PawthonWalkLogRow";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { formatMiles, metersToMiles } from "@/constants/pawthonUi";
import { fetchRecentWalkSessions } from "@/services/walkSessions";
import {
  formatWalkDistanceDuration,
  formatWalkLogDate,
  formatWalkPace,
} from "@/utils/pawthonWalkDisplay";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";

type Filter = "week" | "30d" | "all";

export default function PawthonWalkHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { selectedPet, selectedPetId } = useSelectedPet();
  const { pets } = usePets();
  const [filter, setFilter] = useState<Filter>("week");

  const { data: walks = [], isPending } = useQuery({
    queryKey: ["pawthon", "history", selectedPetId],
    queryFn: () => fetchRecentWalkSessions(selectedPetId!, 100),
    enabled: !!selectedPetId,
  });

  const filtered = useMemo(() => {
    if (filter === "all") return walks;
    const cutoff =
      filter === "week"
        ? moment().startOf("isoWeek")
        : moment().subtract(30, "days").startOf("day");
    return walks.filter((w) => moment(w.ended_at).isSameOrAfter(cutoff));
  }, [walks, filter]);

  const petName = selectedPet?.name ?? "Pet";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
            <Ionicons name="chevron-back" size={28} color={theme.primary} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              marginRight: 28,
              fontFamily: "Poppins_600SemiBold",
              fontSize: 17,
              color: theme.foreground,
            }}
          >
            Walk log
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(
            [
              ["week", "This week"],
              ["30d", "30 days"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setFilter(id)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: filter === id ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: filter === id ? theme.primary : theme.border,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 13,
                  color: filter === id ? theme.primaryForeground : theme.secondary,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isPending ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              {filtered.length === 0 ? (
                <Text
                  style={{
                    paddingVertical: 24,
                    fontFamily: "Poppins_500Medium",
                    fontSize: 14,
                    color: theme.secondary,
                    textAlign: "center",
                  }}
                >
                  No walks in this period. Start one from Home or Pawthon hub.
                </Text>
              ) : (
                filtered.map((w, i) => (
                  <View key={w.id}>
                    {i > 0 ? <View style={{ height: 1, backgroundColor: theme.border }} /> : null}
                    <PawthonWalkLogRow
                      dateLabel={formatWalkLogDate(w.started_at)}
                      petName={petName}
                      distanceMi={formatMiles(metersToMiles(Number(w.distance_meters)))}
                      durationLabel={formatWalkDistanceDuration(w).split(" · ")[1] ?? ""}
                      paceLabel={formatWalkPace(w)}
                      distanceMeters={Number(w.distance_meters)}
                      onPress={() => router.push(`/(home)/pawthon/walk/${w.id}` as any)}
                    />
                  </View>
                ))
              )}
            </View>
            {pets.length > 1 ? (
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: theme.secondary,
                  textAlign: "center",
                  fontFamily: "Poppins_500Medium",
                }}
              >
                Showing walks for {petName} only
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
