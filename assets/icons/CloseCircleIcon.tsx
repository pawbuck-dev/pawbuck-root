import React from "react";
import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

export function CloseCircleIcon({
  size = 24,
  color = "#0D0F0F",
  variant = "linear",
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="432.5 0.5 55 103" fill="none" {...rest}>
      {variant === "linear" && (
        <>
          <Path
            d="M460 38C465.5 38 470 33.5 470 28C470 22.5 465.5 18 460 18C454.5 18 450 22.5 450 28C450 33.5 454.5 38 460 38Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M457.17 30.83L462.83 25.17"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M462.83 30.83L457.17 25.17"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {variant === "bold" && (
        <Path
          d="M460 66C454.49 66 450 70.49 450 76C450 81.51 454.49 86 460 86C465.51 86 470 81.51 470 76C470 70.49 465.51 66 460 66ZM463.36 78.3C463.65 78.59 463.65 79.07 463.36 79.36C463.21 79.51 463.02 79.58 462.83 79.58C462.64 79.58 462.45 79.51 462.3 79.36L460 77.06L457.7 79.36C457.55 79.51 457.36 79.58 457.17 79.58C456.98 79.58 456.79 79.51 456.64 79.36C456.35 79.07 456.35 78.59 456.64 78.3L458.94 76L456.64 73.7C456.35 73.41 456.35 72.93 456.64 72.64C456.93 72.35 457.41 72.35 457.7 72.64L460 74.94L462.3 72.64C462.59 72.35 463.07 72.35 463.36 72.64C463.65 72.93 463.65 73.41 463.36 73.7L461.06 76L463.36 78.3Z"
          fill={color}
        />
      )}
    </Svg>
  );
}
