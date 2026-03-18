import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

/** Figma Iconography: Country (variants: USA, Canada, UK). Replace path with Figma export for exact flags. */
export function CountryIcon({
  size = 24,
  color = "#0D0F0F",
  variant = "default",
  ...rest
}: IconProps & { variant?: "default" | "USA" | "Canada" | "UK" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
