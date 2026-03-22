import { SPOOFED_LOCATION, type MockNearbyVet } from "@/constants/mockVancouverVets";
import { useTheme } from "@/context/themeContext";
import { openGoogleMapsDrivingDirections } from "@/utils/openGoogleMapsDirections";
import { Ionicons } from "@expo/vector-icons";
import { AppleMaps, GoogleMaps } from "expo-maps";
import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { MapViewPlaceholder } from "./MapViewPlaceholder";

type VetClinicMapProps = {
  vets: MockNearbyVet[];
  selectedVetId: string | null;
  /** Marker / map selection only — does not open booking */
  onHighlightVet: (vet: MockNearbyVet) => void;
  /** When the parent shows a bottom sheet with actions (e.g. Figma clinic card), hide the map overlay bar */
  hideBottomDirectionsBar?: boolean;
  /** Search radius circle around the user pin (meters). Default 25 km. */
  searchRadiusMeters?: number;
  /**
   * Map fills parent height; no outer margin — use when the parent sets a fixed height (book flow map + list below).
   */
  embedded?: boolean;
};

const MAP_MIN_HEIGHT = 280;
const USER_MARKER_ID = "user-area";

function boundsFromVets(vets: MockNearbyVet[]) {
  const lats = [SPOOFED_LOCATION.latitude, ...vets.map((v) => v.latitude)];
  const lngs = [SPOOFED_LOCATION.longitude, ...vets.map((v) => v.longitude)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latSpan = Math.max(maxLat - minLat, 0.02);
  return { midLat, midLng, latSpan };
}

function zoomFromLatSpan(latSpan: number): number {
  if (latSpan < 0.03) return 15;
  if (latSpan < 0.06) return 14;
  if (latSpan < 0.12) return 13;
  return 12;
}

/**
 * Native maps via **expo-maps**: Apple Maps on iOS, Google Maps on Android.
 * Avoids `react-native-maps` + New Architecture crashes while keeping Reanimated 4 (requires New Arch).
 * Driving directions still open in the Google Maps app from both platforms.
 */
export function VetClinicMap({
  vets,
  selectedVetId,
  onHighlightVet,
  hideBottomDirectionsBar = false,
  searchRadiusMeters = 25_000,
  embedded = false,
}: VetClinicMapProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const { midLat, midLng, latSpan } = useMemo(() => boundsFromVets(vets), [vets]);
  const cameraPosition = useMemo(
    () => ({
      coordinates: { latitude: midLat, longitude: midLng },
      zoom: zoomFromLatSpan(latSpan * 1.4),
    }),
    [midLat, midLng, latSpan]
  );

  const demoCircle = useMemo(
    () => ({
      id: "demo-radius",
      center: { latitude: SPOOFED_LOCATION.latitude, longitude: SPOOFED_LOCATION.longitude },
      radius: Math.max(500, Math.min(searchRadiusMeters, 80_000)),
      lineColor: "rgba(59, 208, 210, 0.85)",
      lineWidth: 2,
      color: "rgba(59, 208, 210, 0.12)",
    }),
    [searchRadiusMeters]
  );

  const appleMarkers = useMemo((): AppleMaps.Marker[] => {
    const list: AppleMaps.Marker[] = [
      {
        id: USER_MARKER_ID,
        coordinates: {
          latitude: SPOOFED_LOCATION.latitude,
          longitude: SPOOFED_LOCATION.longitude,
        },
        title: "Your area (demo)",
        systemImage: "mappin.circle.fill",
        tintColor: "#3BD0D2",
      },
    ];
    for (const vet of vets) {
      list.push({
        id: vet.id,
        coordinates: { latitude: vet.latitude, longitude: vet.longitude },
        title: vet.name,
        tintColor: vet.id === selectedVetId ? "#0D8B8D" : "#C43BAD",
      });
    }
    return list;
  }, [vets, selectedVetId]);

  const googleMarkers = useMemo((): GoogleMaps.Marker[] => {
    const list: GoogleMaps.Marker[] = [
      {
        id: USER_MARKER_ID,
        coordinates: {
          latitude: SPOOFED_LOCATION.latitude,
          longitude: SPOOFED_LOCATION.longitude,
        },
        title: "Your area (demo)",
        snippet: SPOOFED_LOCATION.label,
      },
    ];
    for (const vet of vets) {
      list.push({
        id: vet.id,
        coordinates: { latitude: vet.latitude, longitude: vet.longitude },
        title: vet.name,
        snippet: `${vet.address} · ${vet.distanceKm.toFixed(1)} km`,
      });
    }
    return list;
  }, [vets]);

  const handleMarkerClick = useCallback(
    (event: { id?: string }) => {
      if (!event.id || event.id === USER_MARKER_ID) return;
      const vet = vets.find((v) => v.id === event.id);
      if (vet) onHighlightVet(vet);
    },
    [vets, onHighlightVet]
  );

  const selected = vets.find((v) => v.id === selectedVetId) ?? null;

  const onDirections = useCallback(async () => {
    if (!selected) return;
    await openGoogleMapsDrivingDirections(selected.latitude, selected.longitude, selected.name);
  }, [selected]);

  if (Platform.OS === "web") {
    return <MapViewPlaceholder clinicCount={vets.length} />;
  }

  const directionsBar =
    hideBottomDirectionsBar ? null : (
      <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2" pointerEvents="box-none">
        <Pressable
          onPress={onDirections}
          disabled={!selected}
          className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl active:opacity-90"
          style={{
            backgroundColor: selected ? "#3BD0D2" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            opacity: selected ? 1 : 0.55,
          }}
        >
          <Ionicons name="navigate" size={20} color={selected ? "#FFFFFF" : isDark ? "#888" : "#666"} />
          <Text
            className="ml-2 text-sm font-semibold"
            style={{
              fontFamily: "Poppins_600SemiBold",
              color: selected ? "#FFFFFF" : isDark ? "#888" : "#666",
            }}
            numberOfLines={1}
          >
            {selected ? "Directions in Google Maps" : "Select a clinic on the map"}
          </Text>
        </Pressable>
      </View>
    );

  const shellClass = embedded
    ? "flex-1 rounded-2xl overflow-hidden"
    : "flex-1 rounded-2xl overflow-hidden mx-5 mb-4";
  const outerStyle = embedded ? { flex: 1 as const } : { minHeight: MAP_MIN_HEIGHT };
  const mapInnerStyle = embedded ? { flex: 1 as const } : { flex: 1 as const, minHeight: MAP_MIN_HEIGHT };

  if (Platform.OS === "ios") {
    return (
      <View className={shellClass} style={outerStyle}>
        <AppleMaps.View
          style={mapInnerStyle}
          cameraPosition={cameraPosition}
          markers={appleMarkers}
          circles={[demoCircle]}
          onMarkerClick={handleMarkerClick}
        />
        {directionsBar}
      </View>
    );
  }

  return (
    <View className={shellClass} style={outerStyle}>
      <GoogleMaps.View
        style={mapInnerStyle}
        cameraPosition={cameraPosition}
        markers={googleMarkers}
        circles={[demoCircle]}
        colorScheme={
          isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.FOLLOW_SYSTEM
        }
        onMarkerClick={handleMarkerClick}
      />
      {directionsBar}
    </View>
  );
}
