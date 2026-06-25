/**
 * CTA (Button) — from Figma Elements 44:408, component set CTA 44:155.
 * Size: LG | MD | SM. Style: Solid | Outline | Ghost. State: Default | Disable | Destructive.
 *
 * Solid primary spec:
 *   border-radius: var(--100, 100px);
 *   background: var(--Button-Solid-bg, #12BAB7);
 *   box-shadow: 0 -5px 16px 0 #0B9696 inset, 0 5px 16px 0 #5CECE2 inset;
 */
import { useTheme } from "@/context/themeContext";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";

const OUTLINE_BORDER_DARK = "rgba(255,255,255,0.5)";
const OUTLINE_BORDER_LIGHT = "rgba(29,36,51,0.35)";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

const BUTTON_SOLID_BG = "#12BAB7";
const SOLID_INSET_TOP = "#0B9696";
const SOLID_INSET_BTM = "#5CECE2";
const DISABLE_BG = "rgba(255,255,255,0.10)";
const DISABLE_INSET = "rgba(255,255,255,0.08)";
const PILL = 100;

export type CTASize = "LG" | "MD" | "SM";
export type CTAStyle = "Solid" | "Outline" | "Ghost";
export type CTAState = "Default" | "Disable" | "Destructive";

export interface CTAProps {
  label: string;
  onPress?: () => void;
  size?: CTASize;
  style?: CTAStyle;
  state?: CTAState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** Maestro / Detox automation anchor */
  testID?: string;
  accessibilityLabel?: string;
}

const SIZE = {
  LG: { pv: 16, ph: 32, fs: 16 },
  MD: { pv: 12, ph: 24, fs: 14 },
  SM: { pv: 8, ph: 16, fs: 12 },
} as const;

export function CTA({
  label,
  onPress,
  size = "LG",
  style: variant = "Solid",
  state = "Default",
  leftIcon,
  rightIcon,
  disabled,
  containerStyle,
  testID,
  accessibilityLabel,
}: CTAProps) {
  const { theme, mode } = useTheme();
  const [pressed, setPressed] = useState(false);
  const isDark = mode === "dark";
  const isDisabled = disabled || state === "Disable";
  const s = SIZE[size];

  let bg: string;
  let borderW = 0;
  let borderC = "transparent";
  let textColor: string;

  if (variant === "Solid") {
    bg = state === "Disable" ? DISABLE_BG : state === "Destructive" ? theme.error : BUTTON_SOLID_BG;
    textColor = state === "Disable" ? theme.secondary : "#FFFFFF";
  } else if (variant === "Outline") {
    bg = state === "Destructive" ? `${theme.primary}14` : "transparent";
    borderW = 1.5;
    borderC = state === "Destructive" ? `${theme.primary}29` : isDark ? OUTLINE_BORDER_DARK : OUTLINE_BORDER_LIGHT;
    textColor = state === "Destructive" ? theme.primary : theme.foreground;
  } else {
    bg = "transparent";
    textColor = theme.foreground;
  }

  const showDefaultGradient = variant === "Solid" && state === "Default" && !isDisabled;
  const showDisableGradient = variant === "Solid" && state === "Disable";

  return (
    <View style={[styles.outer, containerStyle]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={isDisabled ? undefined : onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        disabled={isDisabled}
        style={[
          styles.pill,
          {
            paddingVertical: s.pv,
            paddingHorizontal: s.ph,
            backgroundColor: bg,
            borderWidth: borderW,
            borderColor: borderC,
            opacity: pressed && !isDisabled ? 0.85 : 1,
          },
        ]}
      >
        {showDefaultGradient && (
          <LinearGradient
            colors={[`${SOLID_INSET_TOP}40`, "transparent", "transparent", `${SOLID_INSET_BTM}40`]}
            locations={[0, 0.35, 0.65, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        {showDisableGradient && (
          <LinearGradient
            colors={[DISABLE_INSET, "transparent", "transparent", DISABLE_INSET]}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <Text style={[styles.label, { fontSize: s.fs, color: textColor }]}>
          {label}
        </Text>
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: "stretch",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: PILL,
    overflow: "hidden",
  },
  icon: {},
  label: {
    fontWeight: "600",
    textAlign: "center",
  },
});
