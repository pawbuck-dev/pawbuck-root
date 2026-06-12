import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";
import type { MiloChatTokens } from "./miloUiTokens";

type Props = {
  enabled: boolean;
  tokens: MiloChatTokens;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function MiloComposerSendButton({
  enabled,
  tokens,
  onPress,
  accessibilityLabel = "Send message",
}: Props) {
  if (!enabled) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: tokens.sendDisabledBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="arrow-forward" size={19} color={tokens.sendDisabledIcon} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <LinearGradient
        colors={[tokens.sendGradientStart, tokens.sendGradientEnd]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: tokens.sendGradientEnd,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        }}
      >
        <Ionicons name="arrow-forward" size={19} color={tokens.sendIconColor} />
      </LinearGradient>
    </Pressable>
  );
}
