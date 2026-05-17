import { Image } from "expo-image";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const COMPLIANT_FRAME = require("@/assets/icons/ComplaintFrame.svg");

const GREEN = "#1D9C3D";
/** ComplaintFrame.svg uses a fixed white card — text must stay dark for contrast in dark mode. */
const ON_FRAME_TITLE = "#1C1C1E";
const ON_FRAME_BODY = "#727979";

export type CompliantVaccineBannerProps = {
  /** Omit or pass empty string to hide (e.g. when the parent already shows a Compliant badge). */
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
  const showTitle = Boolean(title?.trim());

  return (
    <View style={styles.root}>
      <Image source={COMPLIANT_FRAME} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View style={styles.content} pointerEvents="box-none">
        <View style={styles.row}>
          <View style={styles.textBlock}>
            {showTitle ? (
              <Text style={[styles.title, { color: ON_FRAME_TITLE }]}>{title}</Text>
            ) : null}
            <Text style={[styles.body, { color: ON_FRAME_BODY }]}>{body}</Text>
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
