import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

/**
 * Placeholder vector icon for Figma "logout" (Figma node uses image fill).
 * Replace path with exported SVG from Figma if you need pixel-perfect match.
 */
export function LogoutIcon({
  size = 24,
  color = "#0D0F0F",
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
