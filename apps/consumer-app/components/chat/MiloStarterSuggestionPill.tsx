import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, useWindowDimensions, View } from "react-native";

export type MiloStarterSuggestionPillWidthMode = "stretch" | "intrinsic";

type Props = {
  label: string;
  onPress: () => void;
  /** Match Milo composer field (`composerBg` / `composerBorder` from tokens). */
  fill: string;
  stroke: string;
  textColor: string;
  mode: "light" | "dark";
  /** Horizontal padding on the screen edge (both sides); used to cap pill width. */
  screenHorizontalPaddingPx: number;
  /**
   * `stretch` — full column width (legacy stadium insets for long lines).
   * `intrinsic` — width follows label text up to `maxPillWidth` (stacked quick replies).
   * @default "intrinsic"
   */
  widthMode?: MiloStarterSuggestionPillWidthMode;
};

/**
 * Starter prompt row: chrome lives on a `View` so background/border always paint
 * (some RN layouts treat `Pressable` + shrink oddly).
 */
/** Horizontal inset from the capsule border so glyphs clear the rounded clip (symmetric). */
const INTRINSIC_CURVE_GUTTER_PX = 14;
const INTRINSIC_PRESSABLE_PAD_V = 10;

export function MiloStarterSuggestionPill({
  label,
  onPress,
  fill,
  stroke,
  textColor,
  mode,
  screenHorizontalPaddingPx,
  widthMode = "intrinsic",
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [pillOuterHeight, setPillOuterHeight] = useState(0);

  /** Inner row width inside the padded chat column */
  const maxPillWidth = Math.max(0, windowWidth - screenHorizontalPaddingPx * 2);

  const shellChrome = useMemo(
    () => ({
      marginBottom: 8,
      borderRadius: 9999,
      overflow: "hidden" as const,
      backgroundColor: fill,
      borderWidth: 1,
      borderColor: stroke,
    }),
    [fill, stroke]
  );

  const lightShadow =
    mode === "light"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: Platform.OS === "android" ? 4 : 0,
        }
      : null;

  /**
   * Stadium capsule + overflow:hidden clips glyphs at the curves. Inset ALL content from the
   * shell with an inner gutter (not only Pressable padding) so text sits in a rectangular
   * safe zone away from the rounded clip path — especially line starts on iOS (LTR).
   * (Computed unconditionally for stable hook order; used only when `widthMode === "stretch"`.)
   */
  const { innerGutterPx, textPaddingLeft, textPaddingRight } = useMemo(() => {
    const endCapRadiusPx =
      pillOuterHeight > 0 ? pillOuterHeight / 2 : 30;
    const gutter = Math.max(
      10,
      Math.round(8 + 0.22 * endCapRadiusPx)
    );
    const base = Math.max(
      36,
      Math.ceil(endCapRadiusPx) + 10,
      Math.round(16 + 0.45 * endCapRadiusPx)
    );
    const lineStartGuardPx = Math.max(
      20,
      Math.round(14 + 0.38 * endCapRadiusPx)
    );
    return {
      innerGutterPx: gutter,
      textPaddingLeft: base + lineStartGuardPx,
      // Slight extra on the right so long lines don’t hug the curve after the stronger left inset.
      textPaddingRight: base + 4,
    };
  }, [pillOuterHeight]);

  if (widthMode === "intrinsic") {
    const innerMaxTextWidth = Math.max(
      0,
      maxPillWidth - INTRINSIC_CURVE_GUTTER_PX * 2
    );
    return (
      <View style={[{ alignSelf: "flex-start", maxWidth: maxPillWidth }, shellChrome, lightShadow]}>
        {/* Inner gutter: same idea as stretch mode — keeps text out of the semicircular clip zone. */}
        <View
          style={{
            paddingHorizontal: INTRINSIC_CURVE_GUTTER_PX,
            paddingVertical: 0,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            style={({ pressed }) => ({
              paddingVertical: INTRINSIC_PRESSABLE_PAD_V,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text
              style={{
                maxWidth: innerMaxTextWidth,
                fontSize: 15,
                lineHeight: 22,
                letterSpacing: 0.15,
                color: textColor,
                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                ...(Platform.OS === "ios" ? { paddingLeft: 2, paddingRight: 2 } : {}),
              }}
            >
              {label}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const shellWidth =
    maxPillWidth > 0 ? maxPillWidth : undefined;

  return (
    <View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h <= 0) return;
        setPillOuterHeight((prev) => (Math.abs(h - prev) < 0.5 ? prev : h));
      }}
      style={[
        {
          alignSelf: "stretch",
          width: shellWidth,
          maxWidth: maxPillWidth,
          alignItems: "stretch",
          ...shellChrome,
        },
        lightShadow,
      ]}
    >
      {/* Gutter pulls text away from the shell’s rounded clip; fixes “no change” when only Pressable padded. */}
      <View
        style={{
          width: "100%",
          paddingHorizontal: innerGutterPx,
          paddingVertical: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => ({
            width: "100%",
            paddingVertical: 10,
            paddingLeft: textPaddingLeft,
            paddingRight: textPaddingRight,
            alignItems: "stretch",
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text
            style={{
              width: "100%",
              fontSize: 15,
              lineHeight: 22,
              letterSpacing: 0.15,
              color: textColor,
              ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
              ...(Platform.OS === "ios" ? { paddingLeft: 2 } : {}),
            }}
          >
            {label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
