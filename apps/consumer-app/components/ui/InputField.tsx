/**
 * Input field — from Figma Elements 44:408, component set "input field" 54:1372.
 * States: Default | Focused | Error | Success | Entered | file upload.
 * Border radius 12, padding 14.
 */
import { useTheme } from "@/context/themeContext";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

export type InputFieldState = "Default" | "Focused" | "Error" | "Success" | "Entered";

export interface InputFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  helperText?: string;
  state?: InputFieldState;
  error?: boolean;
  containerStyle?: object;
}

export function InputField({
  label,
  helperText,
  state: controlledState,
  error,
  containerStyle,
  onFocus,
  onBlur,
  ...textInputProps
}: InputFieldProps) {
  const { theme, mode } = useTheme();
  const [focused, setFocused] = useState(false);
  const isDark = mode === "dark";

  const state: InputFieldState =
    controlledState ??
    (error ? "Error" : focused ? "Focused" : "Default");

  const getBorderColor = (): string => {
    if (state === "Error") return theme.error;
    if (state === "Success") return "#30D158";
    if (state === "Focused") return theme.primary;
    return "transparent";
  };

  const getBg = () =>
    isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.secondary}
        style={[
          styles.input,
          {
            backgroundColor: getBg(),
            color: theme.foreground,
            borderWidth: state === "Default" || state === "Entered" ? 0 : 1,
            borderColor: getBorderColor(),
          },
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...textInputProps}
      />
      {helperText ? (
        <Text style={[styles.helper, { color: theme.secondary }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  helper: {
    fontSize: 12,
  },
});
