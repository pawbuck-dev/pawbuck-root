import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { SettingsSubscreenRow } from "@/components/layout/SettingsSubscreenRow";
import { SettingsSubscreenTile } from "@/components/layout/SettingsSubscreenTile";
import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchMessageThreads } from "@/services/messages";
import { buildNotificationHubItems } from "@/utils/notificationHub";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const t = getSettingsSubscreenTokens(theme, isDark);
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
        threads.map((th) => ({
          id: th.id,
          pet_id: th.pet_id,
          petName: th.pet_id ? petNameById[th.pet_id] : undefined,
          recipient_name: th.recipient_name,
          unread_count: th.unread_count,
        }))
      ),
    [pendingApprovals, threads, petNameById]
  );

  if (isLoading) {
    return (
      <SettingsSubscreenLayout title="Notification center" scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </SettingsSubscreenLayout>
    );
  }

  if (items.length === 0) {
    return (
      <SettingsSubscreenLayout title="Notification center" scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="notifications-off-outline" size={48} color={t.muted} />
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 17,
              color: theme.foreground,
              marginTop: 16,
            }}
          >
            All caught up
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 14,
              color: t.muted,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            New messages and emails needing review will show up here.
          </Text>
        </View>
      </SettingsSubscreenLayout>
    );
  }

  return (
    <SettingsSubscreenLayout title="Notification center">
      <SettingsSubscreenTile style={{ marginTop: 0 }}>
        {items.map((item, index) => (
          <View key={item.id}>
            {index > 0 ? <View style={{ height: 12 }} /> : null}
            <SettingsSubscreenRow
              compact
              ionIcon="notifications-outline"
              title={item.title}
              subtitle={item.subtitle}
              trailing="forward"
              onPress={() =>
                router.push({
                  pathname: item.route.pathname as never,
                  params: item.route.params as never,
                })
              }
            />
          </View>
        ))}
      </SettingsSubscreenTile>
    </SettingsSubscreenLayout>
  );
}
