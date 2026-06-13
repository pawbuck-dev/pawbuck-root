import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/themeContext";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MiloEmptyHero } from "./MiloEmptyHero";
import { MiloStarterSuggestionCard } from "./MiloStarterSuggestionCard";
import type { MiloChatTokens } from "./miloUiTokens";
import type { Animated } from "react-native";

type AnalysisAnimationProps = {
  sonarOpacity: Animated.AnimatedInterpolation<number>;
  sonarScale: Animated.AnimatedInterpolation<number>;
  breathScale: Animated.AnimatedInterpolation<number>;
};

type Props = {
  greetingSuffix: string;
  petName?: string | null;
  prompts: string[];
  tokens: MiloChatTokens;
  mode: "light" | "dark";
  onSelectPrompt: (prompt: string) => void;
  onPressPetChip?: () => void;
  analysisBusy?: boolean;
  analysisAnimations?: AnalysisAnimationProps;
  idleFloatEnabled?: boolean;
};

function buildSubtitle(petName?: string | null): string {
  if (petName?.trim()) {
    return `I'm Milo — ask me about ${petName.trim()}'s health, records, or anything in PawBuck.`;
  }
  return "I'm Milo — ask me about your pet's health, records, or anything in PawBuck.";
}

export function MiloEmptyThreadStarters({
  greetingSuffix,
  petName,
  prompts,
  tokens,
  mode,
  onSelectPrompt,
  onPressPetChip,
  analysisBusy = false,
  analysisAnimations,
  idleFloatEnabled = true,
}: Props) {
  const { theme } = useTheme();
  const isDark = mode === "dark";

  return (
    <ScrollView
      style={{ flex: 1, alignSelf: "stretch" }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: "center", width: "100%" }}>
        <MiloEmptyHero
          primaryColor={theme.primary}
          isDark={isDark}
          analysisBusy={analysisBusy}
          analysisAnimations={analysisAnimations}
          idleFloatEnabled={idleFloatEnabled && !analysisBusy}
        />

        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: tokens.greetingEyebrow,
            marginTop: 8,
          }}
        >
          Hi{greetingSuffix}!
        </Text>
        <Text
          style={{
            fontSize: 27,
            fontWeight: "800",
            letterSpacing: -0.7,
            lineHeight: 31,
            color: tokens.textPrimary,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Where should we start?
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: tokens.textSecondary,
            marginTop: 11,
            lineHeight: 20,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          {buildSubtitle(petName)}
        </Text>

        {petName?.trim() ? (
          onPressPetChip ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Selected pet ${petName}. Tap to change.`}
              onPress={onPressPetChip}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: tokens.chipBorder,
                backgroundColor: tokens.chipBg,
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <Ionicons name="paw" size={14} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: tokens.textPrimary }}>
                {petName.trim()}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={tokens.textSecondary}
                style={{ marginLeft: 6 }}
              />
            </Pressable>
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: tokens.chipBorder,
                backgroundColor: tokens.chipBg,
              }}
            >
              <Ionicons name="paw" size={14} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: tokens.textPrimary }}>
                {petName.trim()}
              </Text>
            </View>
          )
        ) : null}
      </View>

      <View style={{ alignSelf: "stretch", width: "100%", marginTop: 24 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: tokens.starterSectionLabel,
            marginBottom: 11,
            marginLeft: 2,
          }}
        >
          Try asking
        </Text>
        {prompts.map((prompt, index) => (
          <MiloStarterSuggestionCard
            key={prompt}
            label={prompt}
            index={index}
            tokens={tokens}
            onPress={() => onSelectPrompt(prompt)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
