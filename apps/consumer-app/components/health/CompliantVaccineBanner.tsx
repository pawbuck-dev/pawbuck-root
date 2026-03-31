import { useTheme } from "@/context/themeContext";
import { Image } from "expo-image";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const COMPLIANT_FRAME = require("@/assets/icons/ComplaintFrame.svg");

const GREEN = "#1D9C3D";

export type CompliantVaccineBannerProps = {
  /** Defaults to "Compliant" */
  title?: string;
  body: string;
  /** Defaults to "View schedule". Omit `onCtaPress` to hide the CTA. */
  ctaLabel?: string;
  onCtaPress?: () => void;
};

/**
 * Figma Complaint.svg — frame (white card + green glow + checkmark) with dynamic copy.
 * Text paths removed in ComplaintFrame.svg; title, body, and CTA are RN Text.
 */
export function CompliantVaccineBanner({
  title = "Compliant",
  body,
  ctaLabel = "View schedule",
  onCtaPress,
}: CompliantVaccineBannerProps) {
  const showCta = onCtaPress != null;
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const titleColor = theme.foreground;
  const bodyColor = isDark ? "rgba(255,255,255,0.72)" : "#727979";

  return (
    <View style={styles.root}>
      <Image source={COMPLIANT_FRAME} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View style={styles.content} pointerEvents="box-none">
        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
            <Text style={[styles.body, { color: bodyColor }]}>{body}</Text>
          </View>
          {showCta ? (
            <Pressable
              onPress={onCtaPress}
              style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 73,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
    paddingLeft: 72,
    paddingRight: 12,
    zIndex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    marginBottom: 4,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  body: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  cta: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "rgba(29, 156, 61, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(29, 156, 61, 0.25)",
  },
  ctaText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: GREEN,
  },
});
