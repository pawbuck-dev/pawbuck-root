import { PawthonHubContent } from "@/components/pawthon/PawthonHubContent";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";
import { useWeeklyChallengeEnabled } from "@/hooks/useWeeklyChallengeEnabled";
import {
  fetchMyWeeklyWalkerRankForCountry,
  fetchPawthonHubStats,
  fetchRecentWalkSessions,
  fetchTodayDistanceMetersForPet,
  fetchWeekWalkSessionsForPet,
  formatWeeklyWalkerRankLine,
} from "@/services/walkSessions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pawthonWalkStartRoute } from "@/utils/pawthonWalkNavigation";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PawthonHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const { selectedPet, selectedPetId } = useSelectedPet();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const petCountry = selectedPet?.country?.trim() ?? "";
  const { weeklyChallengeEnabled } = useWeeklyChallengeEnabled(petCountry);

  const { data: weeklyWalkerRank } = useQuery({
    queryKey: ["pawthon", "weeklyWalkerRank", petCountry],
    queryFn: () => fetchMyWeeklyWalkerRankForCountry(petCountry),
    enabled: weeklyChallengeEnabled && !!user && petCountry.length > 0,
  });

  const { data: hubStats, isLoading } = useQuery({
    queryKey: ["pawthon", "hub", selectedPetId],
    queryFn: async () => {
      const [hub, walks, weekWalks, todayMeters] = await Promise.all([
        fetchPawthonHubStats(selectedPetId!),
        fetchRecentWalkSessions(selectedPetId!, 5),
        fetchWeekWalkSessionsForPet(selectedPetId!),
        fetchTodayDistanceMetersForPet(selectedPetId!),
      ]);
      return { ...hub, recentWalks: walks, weekWalkCount: weekWalks.length, todayMeters };
    },
    enabled: !!selectedPetId,
  });

  if (!selectedPetId || !selectedPet) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: insets.top + 24,
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ fontFamily: "Poppins_500Medium", color: theme.foreground }}>
          Select a pet on Home, then open Pawthon again.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        {isLoading || !hubStats ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <PawthonHubContent
            petName={selectedPet.name}
            walkCount={hubStats.walkCount}
            totalMiles={hubStats.totalMiles}
            petsCount={pets.length}
            weekKm={hubStats.weekKm}
            weekWalkCount={hubStats.weekWalkCount}
            streakDays={hubStats.streak}
            todayMeters={hubStats.todayMeters}
            recentWalks={hubStats.recentWalks}
            showWeeklyChallenge={weeklyChallengeEnabled}
            rankLabel={formatWeeklyWalkerRankLine(
              weeklyWalkerRank?.rank ?? null,
              weeklyWalkerRank?.total ?? 0
            )}
            onBack={() => router.back()}
            onStartWalk={() => {
              queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", selectedPetId] });
              router.push(pawthonWalkStartRoute(pets, selectedPetId));
            }}
            onSeeWalkLog={() => router.push("/(home)/pawthon/history" as any)}
            onWalkPress={(id) => router.push(`/(home)/pawthon/walk/${id}` as any)}
            onWeeklyPress={() => router.push("/(home)/pawthon/weekly" as any)}
            onBadgesPress={() => router.push("/(home)/pawthon/badges" as any)}
            onRemindersPress={() => router.push("/(home)/pawthon/reminders" as any)}
          />
        )}
      </View>
    </View>
  );
}
