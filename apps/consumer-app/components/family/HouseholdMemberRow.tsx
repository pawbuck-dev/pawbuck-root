import { useTheme } from "@/context/themeContext";
import { fetchDisplayNameForUser } from "@/hooks/usePetHealthWrite";
import type { HouseholdMember } from "@/services/householdInvites";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Props = {
  member: HouseholdMember;
  onRemove: (memberId: string) => void;
  rowStyle: object;
  iconWellStyle: object;
};

export function HouseholdMemberRow({ member, onRemove, rowStyle, iconWellStyle }: Props) {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";

  const { data: displayName, isLoading } = useQuery({
    queryKey: ["display_name", member.user_id],
    queryFn: () => fetchDisplayNameForUser(member.user_id),
    staleTime: 300_000,
  });

  const label = isLoading ? "Loading…" : displayName || "Family member";

  return (
    <View style={[rowStyle, { marginBottom: 10 }]}>
      <View style={[iconWellStyle, { width: 40, height: 40, borderRadius: 20, marginRight: 12 }]}>
        <MaterialCommunityIcons
          name="account-outline"
          size={20}
          color={isDarkMode ? "#FFFFFF" : "#1D2433"}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ alignSelf: "flex-start" }} />
        ) : (
          <>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 16,
                color: theme.foreground,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
            <Text style={{ fontSize: 13, color: theme.secondary }}>Household access</Text>
          </>
        )}
      </View>
      <Pressable onPress={() => onRemove(member.id)} hitSlop={8} accessibilityLabel={`Remove ${label}`}>
        <Ionicons name="close-circle" size={22} color="#FF3B30" />
      </Pressable>
    </View>
  );
}
