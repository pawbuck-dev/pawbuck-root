import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, Platform, StyleProp, Text, TouchableOpacity, View, ViewStyle } from "react-native";

export type CareTeamEmptyStateCardProps = {
  /** Shown in subtitle: "{n} contacts can communicate" */
  contactCount: number;
  onAddTeamPress: () => void;
  loading?: boolean;
  /** Disable Add Team (e.g. read-only dashboard) */
  addDisabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Empty "My Care Team" tile — same chrome as Dashboard `MyCareTeamSection` empty state.
 */
export function CareTeamEmptyStateCard({
  contactCount,
  onAddTeamPress,
  loading = false,
  addDisabled = false,
  containerStyle,
}: CareTeamEmptyStateCardProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const isAndroid = Platform.OS === "android";
  const cardBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };

  return (
    <View
      style={[
        {
          backgroundColor: cardBg,
          borderRadius: 24,
          overflow: "hidden",
          marginBottom: 14,
          ...cardBorderStyle,
        },
        containerStyle,
      ]}
    >
      <View style={{ flexDirection: "row", minHeight: 200 }}>
        <View style={{ flex: 1, padding: 20, justifyContent: "space-between", zIndex: 2 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EDEDEE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={22}
                  color={isDark ? "#FFFFFF" : "#1D2433"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>My Care Team</Text>
                <Text style={{ fontSize: 12, color: theme.secondary }}>
                  {contactCount} contacts can communicate
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 24, marginBottom: 20 }} />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A",
                  lineHeight: 20,
                  marginTop: 16,
                  marginBottom: 20,
                }}
              >
                There are no care{"\n"}team members linked{"\n"}to this pet.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={onAddTeamPress}
            disabled={loading || addDisabled}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
              backgroundColor: "transparent",
              gap: 8,
              opacity: loading || addDisabled ? 0.5 : 1,
            }}
          >
            <Ionicons name="add" size={18} color={theme.foreground} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>Add Team</Text>
          </TouchableOpacity>
        </View>

        {!loading && (
          <View
            style={{
              width: 150,
              justifyContent: "flex-end",
              alignItems: "flex-end",
              zIndex: 1,
            }}
          >
            <Image
              source={require("@/assets/images/care.png")}
              style={{
                width: 165,
                height: 165,
                marginBottom: -4,
                marginRight: -8,
              }}
              contentFit="contain"
            />
          </View>
        )}
      </View>
    </View>
  );
}
