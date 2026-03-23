import { Image } from "expo-image";
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

/** viewBox width / height from Frame.svg */
const FRAME_ASPECT = 390 / 220;

export type PawthonFrameIllustrationProps = {
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * `compact` — fixed thumbnail (legacy).
   * `fill` — grow with row: uses flex + full width of column + aspect ratio so the art fills the right side.
   */
  variant?: "compact" | "fill";
  /** Used when variant is `compact` */
  width?: number;
  height?: number;
  /** When `fill`: max height + overflow hidden clips bottom (hides duplicate rank text inside some Frame.svg exports). */
  maxHeight?: number;
};

/** Figma `Frame.svg` — weekly challenge graphic (dashboard + Pawthon hub). */
export function PawthonFrameIllustration({
  variant = "compact",
  width = 120,
  height = 68,
  maxHeight,
  style,
  containerStyle,
}: PawthonFrameIllustrationProps) {
  const source = require("@/assets/icons/Frame.svg");

  if (variant === "fill") {
    return (
      <View
        style={[
          {
            flex: 1.05,
            minWidth: 124,
            minHeight: maxHeight ? undefined : 120,
            maxHeight,
            justifyContent: "flex-start",
            alignItems: "stretch",
            overflow: "hidden",
            alignSelf: "stretch",
          },
          containerStyle,
        ]}
      >
        <Image
          source={source}
          style={[{ width: "100%", aspectRatio: FRAME_ASPECT }, style]}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        {
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
        },
        containerStyle,
      ]}
    >
      <Image
        source={source}
        style={[{ width, height }, style]}
        contentFit="contain"
      />
    </View>
  );
}
