import BottomNavBar from "@/components/home/BottomNavBar";
import HealthRecordsSection from "@/components/home/HealthRecordsSection";
import PetSelector from "@/components/home/PetSelector";
import RequiredVaccinesHubCard from "@/components/health/RequiredVaccinesHubCard";
import { FIGMA_MINT_SCREEN_LIGHT } from "@/constants/figmaHealthLayout";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Health Records hub — Figma 2033:133716. Default route for /health-record/[id] (bottom nav + dashboard).
 */
export default function HealthRecordsHubScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { pets } = usePets();
  const insets = useSafeAreaInsets();

  const pet = pets.find((p) => p.id === id);
  const petName = pet?.name ?? "your pet";

  const pageBg = isDark ? theme.background : FIGMA_MINT_SCREEN_LIGHT;

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 120,
        }}
      >
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: isDark ? "#FFFFFF" : "#0D0F0F",
              letterSpacing: -0.3,
            }}
          >
            Health Records
          </Text>
        </View>

        {pets.length > 1 && (
          <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
            <PetSelector
              pets={pets}
              selectedPetId={id}
              onSelectPet={(petId) => {
                router.replace(`/(home)/health-record/${petId}` as any);
              }}
              notificationCounts={{}}
            />
          </View>
        )}

        <View style={{ paddingHorizontal: 16 }}>
          <RequiredVaccinesHubCard petId={id} />
          <HealthRecordsSection
            petId={id}
            petName={petName}
            variant="hub"
            showTitle={false}
          />
        </View>
      </ScrollView>

      <BottomNavBar activeTab="records" selectedPetId={id} />
    </View>
  );
}
