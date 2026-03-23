import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

export function TickCircleIcon({
  size = 24,
  color = "#0D0F0F",
  variant = "linear",
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="504.5 0.5 55 103" fill="none" {...rest}>
      {variant === "linear" && (
        <>
          <Path
            d="M532 38C537.5 38 542 33.5 542 28C542 22.5 537.5 18 532 18C526.5 18 522 22.5 522 28C522 33.5 526.5 38 532 38Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M527.75 28L530.58 30.83L536.25 25.17"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {variant === "bold" && (
        <Path
          d="M532 66C526.49 66 522 70.49 522 76C522 81.51 526.49 86 532 86C537.51 86 542 81.51 542 76C542 70.49 537.51 66 532 66ZM536.78 73.7L531.11 79.37C530.97 79.51 530.78 79.59 530.58 79.59C530.38 79.59 530.19 79.51 530.05 79.37L527.22 76.54C526.93 76.25 526.93 75.77 527.22 75.48C527.51 75.19 527.99 75.19 528.28 75.48L530.58 77.78L535.72 72.64C536.01 72.35 536.49 72.35 536.78 72.64C537.07 72.93 537.07 73.4 536.78 73.7Z"
          fill={color}
        />
      )}
    </Svg>
  );
}
