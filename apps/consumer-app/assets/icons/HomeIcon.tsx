import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

export function HomeIcon({
  size = 24,
  color = "#0D0F0F",
  variant = "linear",
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0.5 0.5 55 103" fill="none" {...rest}>
      {variant === "linear" && (
        <>
          <Path
            d="M28 34V31"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M26.07 18.82L19.14 24.37C18.36 24.99 17.86 26.3 18.03 27.28L19.36 35.24C19.6 36.66 20.96 37.81 22.4 37.81H33.6C35.03 37.81 36.4 36.65 36.64 35.24L37.97 27.28C38.13 26.3 37.63 24.99 36.86 24.37L29.93 18.83C28.86 17.97 27.13 17.97 26.07 18.82Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {variant === "bold" && (
        <Path
          d="M36.83 72.01L30.28 66.77C29 65.75 27 65.74 25.73 66.76L19.18 72.01C18.24 72.76 17.67 74.26 17.87 75.44L19.13 82.98C19.42 84.67 20.99 86 22.7 86H33.3C34.99 86 36.59 84.64 36.88 82.97L38.14 75.43C38.32 74.26 37.75 72.76 36.83 72.01ZM28.75 82C28.75 82.41 28.41 82.75 28 82.75C27.59 82.75 27.25 82.41 27.25 82V79C27.25 78.59 27.59 78.25 28 78.25C28.41 78.25 28.75 78.59 28.75 79V82Z"
          fill={color}
        />
      )}
    </Svg>
  );
}
