import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

/** Figma Iconography: water glass (variants: Default, Variant2). Replace path with Figma export. */
export function WaterGlassIcon({
  size = 24,
  color = "#0D0F0F",
  variant = "default",
  ...rest
}: IconProps & { variant?: "default" | "Variant2" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path
        d="M8 4h8l1 4v12H7V8l1-4zM8 4v2M16 4v2M7 8h10"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
