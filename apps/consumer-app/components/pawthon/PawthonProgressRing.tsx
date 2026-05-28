import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export type PawthonProgressRingProps = {
  progress: number;
  size?: number;
};

export function PawthonProgressRing({ progress, size = 48 }: PawthonProgressRingProps) {
  const { theme } = useTheme();
  const pct = Math.min(1, Math.max(0, progress));
  const complete = pct >= 1;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 4,
        borderColor: complete ? PAWTHON_TEAL : theme.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: complete ? "rgba(38,193,193,0.12)" : "transparent",
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      {complete ? (
        <Ionicons name="checkmark" size={22} color={PAWTHON_TEAL} />
      ) : (
        <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: theme.foreground }}>
          {Math.round(pct * 100)}%
        </Text>
      )}
    </View>
  );
}
