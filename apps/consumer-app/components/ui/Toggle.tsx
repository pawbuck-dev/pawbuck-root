/**
 * Toggle — from Figma Elements 44:408, component set "toggle" 512:4910.
 * state: off | on. Size: lg | md | sm.
 */
import { useTheme } from "@/context/themeContext";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export type ToggleSize = "lg" | "md" | "sm";

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  size?: ToggleSize;
  disabled?: boolean;
}

const SIZE_MAP: Record<ToggleSize, { width: number; height: number; thumb: number }> = {
  lg: { width: 52, height: 28, thumb: 24 },
  md: { width: 44, height: 24, thumb: 20 },
  sm: { width: 36, height: 20, thumb: 16 },
};

export function Toggle({
  value,
  onValueChange,
  size = "md",
  disabled,
}: ToggleProps) {
  const { theme } = useTheme();
  const config = SIZE_MAP[size];
  const translateX = useSharedValue(value ? config.width - config.thumb - 4 : 0);

  React.useEffect(() => {
    translateX.value = withSpring(
      value ? config.width - config.thumb - 4 : 0,
      { damping: 15, stiffness: 150 }
    );
  }, [value, config.width, config.thumb]);

  const trackStyle = useAnimatedStyle(() => ({
    width: config.width,
    height: config.height,
    borderRadius: 1000,
    backgroundColor: value ? theme.primary : theme.border,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    width: config.thumb,
    height: config.thumb,
    borderRadius: 1000,
    backgroundColor: "#FFFFFF",
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      testID="pawbuck-toggle"
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: pressed && !disabled ? 0.8 : 1 }]}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    padding: 2,
    justifyContent: "center",
  },
  thumb: {
    position: "absolute",
    left: 2,
    top: 2,
  },
});
