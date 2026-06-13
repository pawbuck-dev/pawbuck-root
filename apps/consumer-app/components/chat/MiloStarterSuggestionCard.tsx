import { getMiloStarterCardMeta } from "@/utils/miloStarterCardMeta";
import { getMiloJournalChipMeta } from "@/utils/miloJournalChipMeta";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { MiloChatTokens } from "./miloUiTokens";

type Props = {
  label: string;
  index: number;
  tokens: MiloChatTokens;
  onPress: () => void;
  variant?: "starter" | "journal";
};

export function MiloStarterSuggestionCard({
  label,
  index,
  tokens,
  onPress,
  variant = "starter",
}: Props) {
  const meta =
    variant === "journal" ? getMiloJournalChipMeta(label, index) : getMiloStarterCardMeta(label, index);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: "100%",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: tokens.starterCardBorder,
        backgroundColor: pressed ? tokens.iconWell : tokens.starterCardBg,
        marginBottom: 9,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 13,
          paddingHorizontal: 14,
          width: "100%",
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: meta.iconBg,
            flexShrink: 0,
            marginRight: 13,
          }}
        >
          <Ionicons name={meta.icon} size={19} color={meta.iconColor} />
        </View>

        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
            fontSize: 13.5,
            fontWeight: "600",
            lineHeight: 18,
            letterSpacing: -0.1,
            color: tokens.textPrimary,
            ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
          }}
        >
          {label}
        </Text>

        <View style={{ flexShrink: 0, marginLeft: 8, width: 20, alignItems: "center" }}>
          <Ionicons name="chevron-forward" size={17} color={tokens.starterSectionLabel} />
        </View>
      </View>
    </Pressable>
  );
}
