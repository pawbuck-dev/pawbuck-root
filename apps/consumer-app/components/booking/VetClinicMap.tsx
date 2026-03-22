import { SPOOFED_LOCATION, type MockNearbyVet } from "@/constants/mockVancouverVets";
import { useTheme } from "@/context/themeContext";
import { openGoogleMapsDrivingDirections } from "@/utils/openGoogleMapsDirections";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MapViewPlaceholder } from "./MapViewPlaceholder";

type VetClinicMapProps = {
  vets: MockNearbyVet[];
  selectedVetId: string | null;
  /** Marker / map selection only — does not open booking */
  onHighlightVet: (vet: MockNearbyVet) => void;
};

const MAP_MIN_HEIGHT = 280;

function initialRegion(vets: MockNearbyVet[]) {
  const lats = [SPOOFED_LOCATION.latitude, ...vets.map((v) => v.latitude)];
  const lngs = [SPOOFED_LOCATION.longitude, ...vets.map((v) => v.longitude)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.04);
  const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.04);
  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * Google Maps (react-native-maps + PROVIDER_GOOGLE) for clinic pins and demo “you are here”.
 * Requires native API keys after prebuild — see `app.config.js` and Expo MapView docs.
 */
export function VetClinicMap({ vets, selectedVetId, onHighlightVet }: VetClinicMapProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const region = useMemo(() => initialRegion(vets), [vets]);

  const fitAll = useCallback(() => {
    const coords = [
      { latitude: SPOOFED_LOCATION.latitude, longitude: SPOOFED_LOCATION.longitude },
      ...vets.map((v) => ({ latitude: v.latitude, longitude: v.longitude })),
    ];
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 56, right: 36, bottom: 36, left: 36 },
      animated: true,
    });
  }, [vets]);

  useEffect(() => {
    const t = setTimeout(fitAll, 400);
    return () => clearTimeout(t);
  }, [fitAll]);

  const selected = vets.find((v) => v.id === selectedVetId) ?? null;

  const onDirections = useCallback(async () => {
    if (!selected) return;
    await openGoogleMapsDrivingDirections(selected.latitude, selected.longitude, selected.name);
  }, [selected]);

  if (Platform.OS === "web") {
    return <MapViewPlaceholder clinicCount={vets.length} />;
  }

  return (
    <View className="flex-1 rounded-2xl overflow-hidden mx-5 mb-4" style={{ minHeight: MAP_MIN_HEIGHT }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1, minHeight: MAP_MIN_HEIGHT }}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        mapType="standard"
        userInterfaceStyle={isDark ? "dark" : "light"}
        onMapReady={fitAll}
      >
        <Circle
          center={{
            latitude: SPOOFED_LOCATION.latitude,
            longitude: SPOOFED_LOCATION.longitude,
          }}
          radius={120}
          strokeColor="rgba(59, 208, 210, 0.85)"
          fillColor="rgba(59, 208, 210, 0.12)"
          strokeWidth={2}
        />
        <Marker
          coordinate={{
            latitude: SPOOFED_LOCATION.latitude,
            longitude: SPOOFED_LOCATION.longitude,
          }}
          title="Your area (demo)"
          description={SPOOFED_LOCATION.label}
          pinColor="#3BD0D2"
        />
        {vets.map((vet) => (
          <Marker
            key={vet.id}
            coordinate={{ latitude: vet.latitude, longitude: vet.longitude }}
            title={vet.name}
            description={`${vet.address} · ${vet.distanceKm.toFixed(1)} km`}
            pinColor={vet.id === selectedVetId ? "#0D8B8D" : undefined}
            onPress={() => onHighlightVet(vet)}
          />
        ))}
      </MapView>

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
    </View>
  );
}
