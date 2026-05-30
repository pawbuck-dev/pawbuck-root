import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import {
  hasShareableRoute,
  projectedPointsToSvgPolyline,
  projectWalkPathToNormalizedPoints,
  type WalkShareCoord,
} from "@/utils/walkShareCard";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

type Props = {
  path: WalkShareCoord[];
  width: number;
  height: number;
  strokeColor?: string;
};

export function PawthonWalkRouteGraphic({
  path,
  width,
  height,
  strokeColor = PAWTHON_TEAL,
}: Props) {
  const projected = useMemo(() => projectWalkPathToNormalizedPoints(path), [path]);
  const polyline = useMemo(
    () => projectedPointsToSvgPolyline(projected, width, height),
    [projected, width, height]
  );

  if (!hasShareableRoute(path)) {
    return (
      <View
        style={{
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="paw" size={Math.min(width, height) * 0.28} color={strokeColor} />
      </View>
    );
  }

  const start = projected[0];
  const end = projected[projected.length - 1];

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={polyline}
        fill="none"
        stroke={strokeColor}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {start ? (
        <Circle
          cx={start.x * width}
          cy={start.y * height}
          r={7}
          fill={strokeColor}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      ) : null}
      {end && projected.length > 1 ? (
        <Circle
          cx={end.x * width}
          cy={end.y * height}
          r={7}
          fill="#FFFFFF"
          stroke={strokeColor}
          strokeWidth={3}
        />
      ) : null}
    </Svg>
  );
}
