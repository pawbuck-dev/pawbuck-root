import { NavigationIconWell } from "@/components/ui/IconWell";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { getProfileScreenTokens } from "./profileUiTokens";

export function ProfileSectionHeading({ children }: { children: string }) {
  const { theme, mode } = useTheme();
  const t = getProfileScreenTokens(theme, mode === "dark");

  return (
    <Text
      style={{
        fontFamily: "Poppins_500Medium",
        fontSize: 16,
        lineHeight: 19,
        color: t.profileListTitleColor,
        marginTop: 22,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

export function ProfileFigmaRow({
  icon,
  ionIcon,
  leading,
  title,
  subtitle,
  onPress,
  trailing = "forward",
  /** Pet picker row: chevron inside a thin bordered circle (light ref) */
  trailingCircled = false,
}: {
  /** MaterialCommunityIcons name */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Ionicons name (alternative to icon) */
  ionIcon?: keyof typeof Ionicons.glyphMap;
  leading?: ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  trailing?: "forward" | "down" | "none";
  trailingCircled?: boolean;
}) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const t = getProfileScreenTokens(theme, isDark);
  const showTrailing = trailing !== "none";

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
          marginRight: 12,
        }}
      >
        {leading ? (
          <View style={{ marginRight: 12, flexShrink: 0 }}>{leading}</View>
        ) : icon || ionIcon ? (
          <View style={{ marginRight: 12, flexShrink: 0 }}>
            <NavigationIconWell
              size="md"
              {...(icon ? { materialIcon: icon } : { ionIcon: ionIcon! })}
            />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 16,
              color: t.profileListTitleColor,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 13,
              color: t.muted,
              marginTop: 4,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      {showTrailing ? (
        <View style={{ flexShrink: 0, justifyContent: "center" }} pointerEvents="none">
          {trailingCircled && trailing === "down" ? (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: t.cardBorder,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
              }}
            >
              <Ionicons name="chevron-down" size={20} color={t.profileListChevronColor} />
            </View>
          ) : (
            <Ionicons
              name={trailing === "down" ? "chevron-down" : "chevron-forward"}
              size={16}
              color={t.profileListChevronColor}
            />
          )}
        </View>
      ) : null}
    </View>
  );

  const containerStyle = {
    width: "100%" as const,
    minHeight: 68,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  };

  if (!onPress) {
    return <View style={containerStyle}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        ...containerStyle,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {body}
    </Pressable>
  );
}
