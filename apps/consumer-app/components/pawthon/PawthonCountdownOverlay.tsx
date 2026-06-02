import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PawthonCountdownOverlayProps = {
  petName: string;
  display: string;
  phase: "number" | "go";
  onSkip: () => void;
};

export function PawthonCountdownOverlay({
  petName,
  display,
  phase,
  onSkip,
}: PawthonCountdownOverlayProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (phase === "go") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [display, phase]);

  return (
    <View
      style={{
        ...StyleSheetAbsoluteFill,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
      }}
      pointerEvents="box-none"
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: "Poppins_700Bold",
          fontSize: phase === "go" ? 64 : 96,
          color: "#FFFFFF",
          lineHeight: phase === "go" ? 72 : 110,
        }}
        accessibilityLiveRegion="polite"
      >
        {display}
      </Text>
      <Text
        style={{
          fontFamily: "Poppins_500Medium",
          fontSize: 16,
          color: "rgba(255,255,255,0.88)",
          marginTop: 16,
          textAlign: "center",
          paddingHorizontal: 32,
        }}
      >
        {phase === "go" ? "Let's go!" : `Get ready — walk with ${petName}`}
      </Text>
      <Pressable
        onPress={onSkip}
        style={{ position: "absolute", bottom: Math.max(insets.bottom, 16) + 32, padding: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Skip countdown"
      >
        <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
          Skip countdown
        </Text>
      </Pressable>
    </View>
  );
}

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};
