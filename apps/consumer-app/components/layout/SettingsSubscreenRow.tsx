import { NavigationIconWell } from "@/components/ui/IconWell";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { getSettingsSubscreenTokens } from "./settingsSubscreenTokens";

type TrailingKind = "forward" | "external" | "none";

type SettingsSubscreenRowProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** MaterialCommunityIcons name */
  icon?: keyof typeof import("@expo/vector-icons").MaterialCommunityIcons.glyphMap;
  /** Ionicons name (alternative to icon) */
  ionIcon?: keyof typeof Ionicons.glyphMap;
  trailing?: TrailingKind;
  /** Custom trailing element (overrides trailing when set) */
  trailingNode?: ReactNode;
  disabled?: boolean;
  /** Render inside a grouped tile without outer padding */
  compact?: boolean;
};

export function SettingsSubscreenRow({
  title,
  subtitle,
  onPress,
  icon,
  ionIcon,
  trailing = "forward",
  trailingNode,
  disabled = false,
  compact = false,
}: SettingsSubscreenRowProps) {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        width: "100%",
        opacity: disabled ? 0.5 : 1,
        ...(compact ? {} : { paddingVertical: 4 }),
      }}
    >
      {(icon || ionIcon) && (
        <NavigationIconWell
          size="lg"
          {...(icon ? { materialIcon: icon } : { ionIcon: ionIcon! })}
        />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 16,
            color: theme.foreground,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 13,
              lineHeight: 18,
              color: t.muted,
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailingNode ??
        (trailing === "external" ? (
          <Ionicons name="open-outline" size={20} color={t.muted} />
        ) : trailing === "forward" ? (
          <Ionicons name="chevron-forward" size={20} color={t.muted} />
        ) : null)}
    </View>
  );

  if (!onPress || disabled) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, width: "100%" })}
    >
      {content}
    </Pressable>
  );
}

/** Intro paragraph below header */
export function SettingsSubscreenIntro({ children }: { children: string }) {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  return (
    <Text
      style={{
        fontFamily: "Poppins_400Regular",
        fontSize: 14,
        lineHeight: 21,
        color: t.muted,
        marginBottom: 16,
      }}
    >
      {children}
    </Text>
  );
}

/** Section title inside scroll (e.g. "Select a pet") */
export function SettingsSubscreenSectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  return (
    <View style={{ marginTop: 4, marginBottom: 4 }}>
      <Text
        style={{
          fontFamily: "Poppins_600SemiBold",
          fontSize: 20,
          color: t.title,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            fontSize: 14,
            lineHeight: 20,
            color: t.muted,
            marginTop: 6,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
