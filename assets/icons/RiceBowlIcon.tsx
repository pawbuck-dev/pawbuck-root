import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

/** Figma Iconography: rice-bowl-01 (variants: stroke, bold). Replace path with Figma export. */
export function RiceBowlIcon({
  size = 24,
  color = "#0D0F0F",
  variant = "linear",
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {variant === "linear" && (
        <Path
          d="M12 4c-3 0-5 2-5 5v6c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V9c0-3-2-5-5-5zM8 10h8M12 8v2"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {variant === "bold" && (
        <Path
          d="M12 4c-3 0-5 2-5 5v6c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V9c0-3-2-5-5-5z"
          fill={color}
        />
      )}
    </Svg>
  );
}
