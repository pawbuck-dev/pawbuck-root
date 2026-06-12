import BodyTrackerSection from "@/components/home/BodyTrackerSection";
import { healthRecordTabCanvas } from "@/constants/figmaHealthLayout";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useHealthRecordPetId } from "@/hooks/useHealthRecordPetId";
import { parseBodyTrackerSegment } from "@/utils/healthRecordNavigation";
import { petPossessiveLabel } from "@/utils/petCopy";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BodyTrackerScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const petId = useHealthRecordPetId();
  const { pets } = usePets();
  const { segment: segmentParam } = useLocalSearchParams<{ segment?: string }>();
  const initialSegment = parseBodyTrackerSegment(
    Array.isArray(segmentParam) ? segmentParam[0] : segmentParam
  );

  const pet = pets.find((p) => p.id === petId);
  const pageBg = healthRecordTabCanvas(theme, isDark);

  if (!petId) return null;

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.foreground,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            Body & daily habits
          </Text>
          <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }} numberOfLines={1}>
            {petPossessiveLabel(pet?.name, "Weight, intake targets, output history")}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <BodyTrackerSection petId={petId} showTitle={false} initialSegment={initialSegment} />
      </ScrollView>
    </View>
  );
}
