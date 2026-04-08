import BottomNavBar from "@/components/home/BottomNavBar";
import HealthRecordsSection from "@/components/home/HealthRecordsSection";
import PetSelector from "@/components/home/PetSelector";
import RequiredVaccinesHubCard from "@/components/health/RequiredVaccinesHubCard";
import HealthBriefingSummaryCard from "@/components/petJournal/HealthBriefingSummaryCard";
import { FIGMA_MINT_SCREEN_LIGHT } from "@/constants/figmaHealthLayout";
import { usePets } from "@/context/petsContext";
import { petPossessiveLabel } from "@/utils/petCopy";
import { useTheme } from "@/context/themeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
            {petPossessiveLabel(pet?.name, "Health Records")}
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
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/(home)/pet-journal", params: { petId: id } } as any)
            }
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 16,
              marginBottom: 14,
              ...(Platform.OS === "android"
                ? {}
                : {
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  }),
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EDEDEE",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="book-outline" size={22} color={theme.foreground} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Pet Journal</Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
                Log symptoms, behavior & environment
              </Text>
            </View>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              <MaterialCommunityIcons name="arrow-top-right" size={20} color={theme.secondary} />
            </View>
          </TouchableOpacity>

          {pet ? (
            <HealthBriefingSummaryCard
              petId={id}
              pet={pet}
              onPress={() =>
                router.push({ pathname: "/(home)/pet-journal/briefing", params: { petId: id } } as any)
              }
            />
          ) : null}

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
