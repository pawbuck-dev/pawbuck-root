import type { HabitRingVariant } from "@/constants/habitRingColors";
import { HABIT_RING_STROKE } from "@/constants/habitRingColors";
import { useTheme } from "@/context/themeContext";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Props = {
  emoji: string;
  label: string;
  value: string;
  /** 0–100 */
  percent: number;
  variant: HabitRingVariant;
  onPress?: () => void;
  onLongPress?: () => void;
  size?: number;
};

export function IntakeProgressRing({
  emoji,
  label,
  value,
  percent,
  variant,
  onPress,
  onLongPress,
  size = 64,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const stroke = HABIT_RING_STROKE[variant];
  const track = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const r = size * 0.39;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const dashOffset = circumference - (circumference * clamped) / 100;
  const goalMet = clamped >= 100;

  const inner = (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={5} fill="none" />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={stroke}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={goalMet ? 1 : 0.95}
          />
        </Svg>
        <Text style={{ fontSize: size * 0.28 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.foreground }}>{value}</Text>
      <Text style={{ fontSize: 11.5, fontWeight: "600", color: theme.secondary, marginTop: -4 }}>
        {label}
      </Text>
    </View>
  );

  if (!onPress && !onLongPress) return inner;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. Tap to log.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      {inner}
    </Pressable>
  );
}
