import { SPOOFED_LOCATION } from "@/constants/mockVancouverVets";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";

type MapViewPlaceholderProps = {
  clinicCount: number;
  /** Walk maps use a neutral label; booking keeps Vancouver demo copy. */
  variant?: "booking" | "walk";
};

/** Stand-in on **web** only. Native uses `expo-maps` in `VetClinicMap`. */
export function MapViewPlaceholder({ clinicCount, variant = "booking" }: MapViewPlaceholderProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <View className="flex-1 rounded-2xl overflow-hidden mx-5 mb-4" style={{ minHeight: 280 }}>
      <LinearGradient
        colors={isDark ? ["#1a3d3e", "#0d2526", "#0a1f20"] : ["#C5EBEF", "#E8F6F6", "#F2F7F7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}
      >
        <View
          className="w-16 h-16 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(59, 208, 210, 0.25)" }}
        >
          <Ionicons name="map" size={36} color="#3BD0D2" />
        </View>
        <Text
          className="text-lg font-semibold text-center mb-1"
          style={{ fontFamily: "Poppins_600SemiBold", color: isDark ? "#FFFFFF" : "#0D0F0F" }}
        >
          Map view
        </Text>
        <Text
          className="text-sm text-center mb-2 px-4"
          style={{ fontFamily: "Poppins_400Regular", color: isDark ? "rgba(255,255,255,0.7)" : "#5A5F6A" }}
        >
          {variant === "walk"
            ? "Map view · GPS route on mobile"
            : `${SPOOFED_LOCATION.label} · ${clinicCount} clinics nearby (demo)`}
        </Text>
        <Text
          className="text-xs text-center px-6"
          style={{ fontFamily: "Poppins_400Regular", color: isDark ? "rgba(255,255,255,0.45)" : "#8B9399" }}
        >
          Open this screen on iOS or Android for the interactive map (expo-maps).
        </Text>
      </LinearGradient>
    </View>
  );
}
