import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

/**
 * Placeholder vector icon for Figma "success" (Figma node uses image fill).
 * Replace path with exported SVG from Figma if you need pixel-perfect match.
 */
export function SuccessIcon({
  size = 24,
  color = "#0D0F0F",
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01l-3-3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
