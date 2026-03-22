import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type BookingViewMode = "list" | "map";

type BookingFlowHeaderProps = {
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  /** When false, hides list/map toggle (e.g. Select Service step). Default true. */
  showViewModeToggle?: boolean;
  viewMode: BookingViewMode;
  onViewModeChange: (mode: BookingViewMode) => void;
  isDark: boolean;
  foreground: string;
};

/**
 * Figma-style booking header: back (circle), segmented progress with step badge, list/map pill toggle.
 */
export function BookingFlowHeader({
  onBack,
  currentStep,
  totalSteps,
  showViewModeToggle = true,
  viewMode,
  onViewModeChange,
  isDark,
  foreground,
}: BookingFlowHeaderProps) {
  const progress = totalSteps > 0 ? Math.min(currentStep / totalSteps, 1) : 0;
  const trackBg = isDark ? "rgba(255,255,255,0.12)" : "#E4E8EA";
  const fillColor = "#3BD0D2";

  return (
    <View className="flex-row items-center justify-between px-1 mb-4">
      {/* Back — white circle + shadow */}
      <Pressable
        onPress={onBack}
        hitSlop={8}
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <Ionicons name="arrow-back" size={22} color={foreground} />
      </Pressable>

      {/* Progress bar + step pill */}
      <View className="flex-1 mx-2 justify-center min-w-0">
        <View className="relative justify-center" style={{ height: 28 }}>
          <View
            className="h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: trackBg }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                backgroundColor: fillColor,
                borderRadius: 999,
              }}
            />
          </View>
          <View
            className="absolute items-center justify-center rounded-full px-1.5 py-0.5"
            style={{
              left: `${progress * 100}%`,
              marginLeft: -18,
              top: 4,
              minWidth: 36,
              backgroundColor: "rgba(59, 208, 210, 0.95)",
              borderWidth: 2,
              borderColor: isDark ? "#1a1f2e" : "#F2F7F7",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 10,
                color: "#FFFFFF",
              }}
            >
              {currentStep}/{totalSteps}
            </Text>
          </View>
        </View>
      </View>

      {/* List / Map toggle — same width as back when hidden for layout balance */}
      {showViewModeToggle ? (
        <View
          className="flex-row rounded-full p-1"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Pressable
            onPress={() => onViewModeChange("list")}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: viewMode === "list" ? fillColor : "transparent",
            }}
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === "list" ? "#FFFFFF" : foreground}
            />
          </Pressable>
          <Pressable
            onPress={() => onViewModeChange("map")}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: viewMode === "map" ? fillColor : "transparent",
            }}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={viewMode === "map" ? "#FFFFFF" : foreground}
            />
          </Pressable>
        </View>
      ) : (
        <View className="w-11 h-11" />
      )}
    </View>
  );
}
