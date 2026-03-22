import { MapViewPlaceholder } from "@/components/booking/MapViewPlaceholder";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { AppleMaps, GoogleMaps } from "expo-maps";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";

export type PawthonMapCoord = { latitude: number; longitude: number };

export type PawthonWalkMapRef = {
  recenter: (coord: PawthonMapCoord, zoom?: number) => void;
};

type Props = {
  path: PawthonMapCoord[];
  style?: StyleProp<ViewStyle>;
  showUserLocation?: boolean;
};

function zoomForSpan(latSpan: number): number {
  if (latSpan < 0.002) return 17;
  if (latSpan < 0.008) return 16;
  if (latSpan < 0.02) return 15;
  if (latSpan < 0.05) return 14;
  return 13;
}

type NativeMapRef = AppleMaps.MapView | GoogleMaps.MapView | null;

/**
 * Walk route map: teal polyline + start / current markers (expo-maps).
 */
export const PawthonWalkMap = forwardRef<PawthonWalkMapRef, Props>(function PawthonWalkMap(
  { path, style, showUserLocation = true },
  ref
) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const mapRef = useRef<NativeMapRef>(null);

  const end = path[path.length - 1] ?? null;
  const start = path[0] ?? null;

  const latSpan = useMemo(() => {
    if (path.length < 2) return 0.01;
    const lats = path.map((p) => p.latitude);
    const lngs = path.map((p) => p.longitude);
    return Math.max(0.002, Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  }, [path]);

  const cameraPosition = useMemo(() => {
    if (path.length >= 2 && end) {
      const lats = path.map((p) => p.latitude);
      const lngs = path.map((p) => p.longitude);
      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      return {
        coordinates: { latitude: midLat, longitude: midLng },
        zoom: zoomForSpan(latSpan * 1.2),
      };
    }
    if (end) {
      return { coordinates: { latitude: end.latitude, longitude: end.longitude }, zoom: 16 };
    }
    return {
      coordinates: { latitude: 49.2827, longitude: -123.1207 },
      zoom: 12,
    };
  }, [path, end, latSpan]);

  const appleMarkers = useMemo((): AppleMaps.Marker[] => {
    const list: AppleMaps.Marker[] = [];
    if (start) {
      list.push({
        id: "pawthon-start",
        coordinates: start,
        title: "Start",
        systemImage: "circle.fill",
        tintColor: PAWTHON_TEAL,
      });
    }
    if (end) {
      list.push({
        id: "pawthon-current",
        coordinates: end,
        title: "Here",
        systemImage: "location.fill",
        tintColor: PAWTHON_TEAL,
      });
    }
    return list;
  }, [start, end]);

  const googleMarkers = useMemo((): GoogleMaps.Marker[] => {
    const list: GoogleMaps.Marker[] = [];
    if (start) {
      list.push({ id: "pawthon-start", coordinates: start, title: "Start", snippet: "" });
    }
    if (end) {
      list.push({ id: "pawthon-current", coordinates: end, title: "Here", snippet: "" });
    }
    return list;
  }, [start, end]);

  const polylineCoords = useMemo(
    () => path.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [path]
  );

  const applePolylines = useMemo(() => {
    if (polylineCoords.length < 2) return [];
    return [
      {
        id: "walk-route",
        coordinates: polylineCoords,
        color: PAWTHON_TEAL,
        width: 5,
      },
    ];
  }, [polylineCoords]);

  const googlePolylines = useMemo(() => {
    if (polylineCoords.length < 2) return [];
    return [
      {
        id: "walk-route",
        coordinates: polylineCoords,
        color: PAWTHON_TEAL,
        width: 5,
        geodesic: true,
      },
    ];
  }, [polylineCoords]);

  useImperativeHandle(ref, () => ({
    recenter: (coord, zoom = 17) => {
      mapRef.current?.setCameraPosition?.({
        coordinates: { latitude: coord.latitude, longitude: coord.longitude },
        zoom,
      });
    },
  }));

  if (Platform.OS === "web") {
    return (
      <View style={[{ flex: 1, minHeight: 200 }, style]}>
        <MapViewPlaceholder clinicCount={0} />
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, overflow: "hidden" }, style]}>
      {Platform.OS === "ios" ? (
        <AppleMaps.View
          ref={mapRef as React.Ref<AppleMaps.MapView>}
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          markers={appleMarkers}
          polylines={applePolylines}
          properties={{ isMyLocationEnabled: showUserLocation }}
        />
      ) : (
        <GoogleMaps.View
          ref={mapRef as React.Ref<GoogleMaps.MapView>}
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          markers={googleMarkers}
          polylines={googlePolylines}
          colorScheme={
            isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.FOLLOW_SYSTEM
          }
          properties={{ isMyLocationEnabled: showUserLocation }}
        />
      )}
    </View>
  );
});
