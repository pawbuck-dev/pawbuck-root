import { PawthonTrophyIllustration } from "@/components/pawthon/PawthonTrophyIllustration";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";
import { useWeeklyChallengeEnabled } from "@/hooks/useWeeklyChallengeEnabled";
import {
  fetchMyWeeklyWalkerRankForCountry,
  fetchWeekWalkSessionsForPet,
  formatWeeklyWalkerRankLine,
} from "@/services/walkSessions";
import { formatMiles, metersToMiles } from "@/constants/pawthonUi";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";

export default function PawthonWeeklyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { selectedPet, selectedPetId } = useSelectedPet();
  const { user } = useAuth();

  const creamBg = isDark
    ? (["#2A2622", "#1E1C1A", "#252220"] as const)
    : (["#FFFDF8", "#FAF3E8", "#FFF9F0"] as const);

  const { data: sessions = [], isPending } = useQuery({
    queryKey: ["pawthon", "weekly", selectedPetId],
    queryFn: () => fetchWeekWalkSessionsForPet(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const petCountry = selectedPet?.country?.trim() ?? "";
  const { weeklyChallengeEnabled } = useWeeklyChallengeEnabled(petCountry);

  const { data: rank } = useQuery({
    queryKey: ["pawthon", "weeklyWalkerRank", petCountry],
    queryFn: () => fetchMyWeeklyWalkerRankForCountry(petCountry),
    enabled: weeklyChallengeEnabled && !!user && petCountry.length > 0,
  });

  const weekMiles = useMemo(() => {
    const m = sessions.reduce((a, s) => a + Number(s.distance_meters), 0);
    return metersToMiles(m);
  }, [sessions]);

  const byDay = useMemo(() => {
    const days: { label: string; miles: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = moment().startOf("isoWeek").add(i, "days");
      const key = d.format("YYYY-MM-DD");
      const meters = sessions
        .filter((s) => moment(s.ended_at).format("YYYY-MM-DD") === key)
        .reduce((a, s) => a + Number(s.distance_meters), 0);
      days.push({ label: d.format("ddd"), miles: metersToMiles(meters) });
    }
    return days;
  }, [sessions]);

  const maxMiles = Math.max(0.01, ...byDay.map((d) => d.miles));

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
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
            This week
          </Text>
        </View>

        {!weeklyChallengeEnabled ? (
          <View style={{ paddingTop: 24 }}>
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 15, color: theme.secondary, lineHeight: 22 }}>
              Weekly rankings unlock when more walkers in {selectedPet?.name ?? "your pet"}&apos;s country join
              PawBuck. Your walk log has your routes and stats.
            </Text>
            <Pressable onPress={() => router.replace("/(home)/pawthon/history" as any)} style={{ marginTop: 20 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.primary }}>
                Open walk log
              </Text>
            </Pressable>
          </View>
        ) : isPending ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={creamBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 20, marginBottom: 16, minHeight: 140 }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, letterSpacing: 1.2, color: theme.secondary }}>
                YOUR WEEK
              </Text>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 28, color: theme.foreground, marginTop: 6 }}>
                {formatMiles(weekMiles)} mi
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: theme.secondary, marginTop: 8 }}>
                {sessions.length} walks with {selectedPet?.name ?? "your pet"}
              </Text>
              {rank ? (
                <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: theme.secondary, marginTop: 4 }}>
                  {formatWeeklyWalkerRankLine(rank.rank, rank.total)}
                </Text>
              ) : null}
              <View style={{ position: "absolute", right: 8, bottom: 0 }}>
                <PawthonTrophyIllustration size={100} />
              </View>
            </LinearGradient>

            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 15, color: theme.foreground, marginBottom: 12 }}>
                Distance by day
              </Text>
              {byDay.map((d) => (
                <View key={d.label} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 }}>
                  <Text style={{ width: 36, fontFamily: "Poppins_600SemiBold", fontSize: 12, color: theme.secondary }}>
                    {d.label}
                  </Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: "hidden" }}>
                    <View
                      style={{
                        width: `${(d.miles / maxMiles) * 100}%`,
                        height: "100%",
                        backgroundColor: PAWTHON_TEAL,
                      }}
                    />
                  </View>
                  <Text style={{ width: 36, textAlign: "right", fontFamily: "Poppins_500Medium", fontSize: 12, color: theme.secondary }}>
                    {d.miles < 10 ? d.miles.toFixed(1) : d.miles.toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable onPress={() => router.push("/pawthon-walk")}>
              <LinearGradient
                colors={[PAWTHON_TEAL, "#1FA8A8"]}
                style={{ paddingVertical: 16, borderRadius: 28, alignItems: "center" }}
              >
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>
                  Start a walk
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
