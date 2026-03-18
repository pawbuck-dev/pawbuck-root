import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

export function ProfileIcon({
  size = 24,
  color = "#0D0F0F",
  variant = "linear",
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="216.5 0.5 55 103" fill="none" {...rest}>
      {variant === "linear" && (
        <>
          <Path
            d="M244.16 26.87C244.06 26.86 243.94 26.86 243.83 26.87C241.45 26.79 239.56 24.84 239.56 22.44C239.56 19.99 241.54 18 244 18C246.45 18 248.44 19.99 248.44 22.44C248.43 24.84 246.54 26.79 244.16 26.87Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M239.16 30.56C236.74 32.18 236.74 34.82 239.16 36.43C241.91 38.27 246.42 38.27 249.17 36.43C251.59 34.81 251.59 32.17 249.17 30.56C246.43 28.73 241.92 28.73 239.16 30.56Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {variant === "bold" && (
        <>
          <Path
            d="M244 66C241.38 66 239.25 68.13 239.25 70.75C239.25 73.32 241.26 75.4 243.88 75.49C243.96 75.48 244.04 75.48 244.1 75.49C244.12 75.49 244.13 75.49 244.15 75.49C244.16 75.49 244.16 75.49 244.17 75.49C246.73 75.4 248.74 73.32 248.75 70.75C248.75 68.13 246.62 66 244 66Z"
            fill={color}
          />
          <Path
            d="M249.08 78.15C246.29 76.29 241.74 76.29 238.93 78.15C237.66 79 236.96 80.15 236.96 81.38C236.96 82.61 237.66 83.75 238.92 84.59C240.32 85.53 242.16 86 244 86C245.84 86 247.68 85.53 249.08 84.59C250.34 83.74 251.04 82.6 251.04 81.36C251.03 80.13 250.34 78.99 249.08 78.15Z"
            fill={color}
          />
        </>
      )}
    </Svg>
  );
}
