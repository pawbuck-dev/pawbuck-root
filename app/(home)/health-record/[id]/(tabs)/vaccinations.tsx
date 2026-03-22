import { VaccinationCard } from "@/components/vaccinations/VaccinationCard";
import {
  FIGMA_HEALTH_TEAL,
  healthRecordTabCanvas,
} from "@/constants/figmaHealthLayout";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { useVaccineCategories } from "@/hooks/useVaccineCategories";
import { VaccineCategory } from "@/services/vaccineRequirements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

const SECTION_TITLE: Record<VaccineCategory, string> = {
  required: "Required Vaccines",
  recommended: "Recommended Vaccines",
  other: "Other Vaccines",
};

export default function VaccinationsScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const listCanvas = healthRecordTabCanvas(theme, isDark);
  const { vaccinations, isLoading } = useVaccinations();
  const { pet } = useSelectedPet();
  const { categorizedVaccinations, isLoadingRequirements } = useVaccineCategories();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!pet) return;
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["vaccinations", pet.id] }),
      queryClient.invalidateQueries({
        queryKey: ["vaccineRequirements", pet.country, pet.animal_type],
      }),
      queryClient.invalidateQueries({ queryKey: ["vaccineEquivalencies"] }),
    ]);
    setRefreshing(false);
  }, [queryClient, pet]);

  useFocusEffect(
    React.useCallback(() => {
      if (!pet) return;
      queryClient.invalidateQueries({ queryKey: ["vaccinations", pet.id] });
    }, [queryClient, pet])
  );

  if (!pet) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: listCanvas }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isLoading || isLoadingRequirements) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: listCanvas }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (vaccinations.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: listCanvas }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ minHeight: 420 }}
        >
          <View
            className="items-center justify-center mb-6"
            style={{
              width: 128,
              height: 128,
              borderRadius: 64,
              backgroundColor: FIGMA_HEALTH_TEAL,
            }}
          >
            <MaterialCommunityIcons name="heart-pulse" size={56} color="#FFFFFF" />
          </View>
          <Text
            className="text-xl font-bold mb-2 text-center"
            style={{ color: theme.foreground }}
          >
            No Vaccines Recorded Yet
          </Text>
          <Text
            className="text-sm text-center leading-5"
            style={{ maxWidth: 320, color: theme.secondary }}
          >
            Ask your vet to email or upload your pet&apos;s vaccine certificate below.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const { required, recommended, other } = categorizedVaccinations;

  const sections: { category: VaccineCategory; items: typeof required }[] = [
    { category: "required", items: required },
    { category: "recommended", items: recommended },
    { category: "other", items: other },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: listCanvas }}>
      <ScrollView
        className="flex-1 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View className="px-4">
          {sections.map(({ category, items }) => {
            if (items.length === 0) return null;
            return (
              <View key={category} style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: theme.foreground,
                    marginBottom: 12,
                    marginTop: 4,
                  }}
                >
                  {SECTION_TITLE[category]}
                </Text>
                {items.map((item) => (
                  <VaccinationCard
                    key={item.vaccination.id}
                    vaccination={item.vaccination}
                    category={item.category}
                  />
                ))}
              </View>
            );
          })}
        </View>

        <View className="h-28" />
      </ScrollView>
    </View>
  );
}
