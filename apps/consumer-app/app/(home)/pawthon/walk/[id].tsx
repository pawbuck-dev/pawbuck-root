import { PawthonWalkMap } from "@/components/pawthon/PawthonWalkMap";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import {
  formatDurationWalk,
  formatMiles,
  formatPace,
  metersToMiles,
  paceMinPerMile,
} from "@/constants/pawthonUi";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchWalkSessionById } from "@/services/walkSessions";
import { parseWalkPoints } from "@/utils/pawthonWalkDisplay";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";

export default function PawthonWalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();

  const { data: session, isPending } = useQuery({
    queryKey: ["pawthon", "walk", id],
    queryFn: () => fetchWalkSessionById(id!),
    enabled: !!id,
  });

  const pet = session ? pets.find((p) => p.id === session.pet_id) : null;
  const path = session ? parseWalkPoints(session) : [];
  const miles = session ? metersToMiles(Number(session.distance_meters)) : 0;
  const pace = session ? paceMinPerMile(session.duration_seconds, miles) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {isPending || !session ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}>
          <View style={{ height: 280, backgroundColor: "#243038" }}>
            <PawthonWalkMap path={path} style={{ flex: 1 }} />
            <Pressable
              onPress={() => router.back()}
              style={{ position: "absolute", top: insets.top + 8, left: 16, zIndex: 10 }}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="paw" size={22} color={theme.primary} />
              </View>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: theme.foreground }}>
                Walk with {pet?.name ?? "your pet"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {[
                { v: formatMiles(miles), l: "Distance" },
                { v: formatDurationWalk(session.duration_seconds), l: "Duration" },
                { v: formatPace(pace), l: "Pace" },
              ].map((s) => (
                <View
                  key={s.l}
                  style={{
                    flex: 1,
                    backgroundColor: theme.card,
                    borderRadius: 20,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground }}>
                    {s.v}
                  </Text>
                  <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: theme.secondary, marginTop: 4 }}>
                    {s.l}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: theme.secondary, marginBottom: 16 }}>
              Started {moment(session.started_at).format("h:mm A")} · Ended{" "}
              {moment(session.ended_at).format("h:mm A")}
            </Text>

            <Pressable
              onPress={() => {
                Share.share({
                  message: `Walked ${formatMiles(miles)} mi with ${pet?.name ?? "my pet"} on PawBuck Pawthon`,
                }).catch(() => {});
              }}
              style={{
                paddingVertical: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>
                Share route
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push("/pawthon-walk")}>
              <LinearGradient
                colors={[PAWTHON_TEAL, "#1FA8A8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, borderRadius: 28, alignItems: "center" }}
              >
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>
                  Start similar walk
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
