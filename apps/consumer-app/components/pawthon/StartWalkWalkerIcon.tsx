import { Image } from "expo-image";
import React from "react";

const walkerArt = require("@/assets/images/walker.png");

type Props = {
  size?: number;
  accessibilityLabel?: string;
};

export function StartWalkWalkerIcon({ size = 36, accessibilityLabel }: Props) {
  return (
    <Image
      source={walkerArt}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
