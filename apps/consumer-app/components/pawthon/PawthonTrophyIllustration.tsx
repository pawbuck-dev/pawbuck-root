import { Image } from "expo-image";
import React from "react";
import type { StyleProp, ImageStyle, ViewStyle } from "react-native";
import { View } from "react-native";

// Metro resolves static assets reliably with a relative path (not `@/` in require).
const trophySource = require("../../assets/images/trophy.png");

export type PawthonTrophyIllustrationProps = {
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /**
   * Approximate box size (pt); image keeps aspect via `contentFit="contain"`.
   * @default 156
   */
  size?: number;
};

/** Figma-style 3D trophy (`assets/images/trophy.png`, transparent) for weekly challenge / Pawthon heroes. */
export function PawthonTrophyIllustration({
  containerStyle,
  imageStyle,
  size = 156,
}: PawthonTrophyIllustrationProps) {
  return (
    <View
      style={[
        {
          width: size + 28,
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "center",
        },
        containerStyle,
      ]}
    >
      <Image
        source={trophySource}
        style={[{ width: size, height: size }, imageStyle]}
        contentFit="contain"
        accessibilityLabel="Weekly challenge trophy"
      />
    </View>
  );
}
