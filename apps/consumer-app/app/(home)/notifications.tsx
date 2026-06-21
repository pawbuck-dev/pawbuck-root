import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchMessageThreads } from "@/services/messages";
import { buildNotificationHubItems } from "@/utils/notificationHub";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const { pendingApprovals } = useEmailApproval();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  const petNameById = useMemo(() => {
    const map: Record<string, string> = {};
    pets.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [pets]);

  const items = useMemo(
    () =>
      buildNotificationHubItems(
        pendingApprovals.map((a) => ({
          id: a.id,
          pet_id: a.pet_id,
          petName: a.pets?.name ?? petNameById[a.pet_id],
          sender_email: a.sender_email ?? undefined,
        })),
        threads.map((t) => ({
          id: t.id,
          pet_id: t.pet_id,
          petName: t.pet_id ? petNameById[t.pet_id] : undefined,
          recipient_name: t.recipient_name,
          unread_count: t.unread_count,
        }))
      ),
    [pendingApprovals, threads, petNameById]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.foreground} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground, flex: 1 }}>
          Notifications
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.secondary} />
          <Text style={{ fontSize: 17, fontWeight: "600", color: theme.foreground, marginTop: 16 }}>
            All caught up
          </Text>
          <Text style={{ fontSize: 14, color: theme.secondary, textAlign: "center", marginTop: 8 }}>
            New messages and emails needing review will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: item.route.pathname as never,
                  params: item.route.params as never,
                })
              }
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 14, color: theme.secondary, marginTop: 4 }}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
