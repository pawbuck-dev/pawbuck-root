import { PAWTHON_BADGES } from "@/constants/pawthonBadges";
import type { PawthonBadgeId } from "@/constants/pawthonBadges";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { countEarnedBadges, loadEarnedBadges } from "@/services/pawthonBadges";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PawthonBadgesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { user } = useAuth();

  const { data: earned = {}, isPending } = useQuery({
    queryKey: ["pawthon", "badges", user?.id],
    queryFn: () => loadEarnedBadges(user!.id),
    enabled: !!user?.id,
  });

  const earnedCount = countEarnedBadges(earned);
  const total = PAWTHON_BADGES.length;
  const pct = total > 0 ? earnedCount / total : 0;

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
            Badges
          </Text>
        </View>

        {isPending ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: theme.secondary }}>
              {earnedCount} of {total} earned
            </Text>
            <View
              style={{
                height: 8,
                backgroundColor: theme.border,
                borderRadius: 4,
                marginVertical: 12,
                overflow: "hidden",
              }}
            >
              <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: PAWTHON_TEAL }} />
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              {PAWTHON_BADGES.map((badge) => {
                const isEarned = !!earned[badge.id as PawthonBadgeId];
                return (
                  <View
                    key={badge.id}
                    style={{
                      width: "30%",
                      alignItems: "center",
                      opacity: isEarned ? 1 : 0.45,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        borderWidth: 2,
                        borderColor: isEarned ? PAWTHON_TEAL : theme.border,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      }}
                    >
                      <Ionicons
                        name={isEarned ? badge.icon : "lock-closed"}
                        size={24}
                        color={isEarned ? PAWTHON_TEAL : theme.secondary}
                      />
                    </View>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 11,
                        color: theme.foreground,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                    >
                      {badge.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
