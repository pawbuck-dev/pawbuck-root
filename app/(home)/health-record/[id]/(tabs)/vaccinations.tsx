import { VaccinationCard } from "@/components/vaccinations/VaccinationCard";
import { VaccinationSectionHeader } from "@/components/vaccinations/VaccinationSectionHeader";
import { VaccinationStatusHeader } from "@/components/vaccinations/VaccinationStatusHeader";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { useVaccineCategories } from "@/hooks/useVaccineCategories";
import { VaccineCategory } from "@/services/vaccineRequirements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

export default function VaccinationsScreen() {
  const { theme } = useTheme();
  const { vaccinations, isLoading } = useVaccinations();
  const { pet } = useSelectedPet();
  const { categorizedVaccinations, requiredVaccinesStatus, isLoadingRequirements } = useVaccineCategories();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Track expanded state for each section
  const [expandedSections, setExpandedSections] = useState<Record<VaccineCategory, boolean>>({
    required: true,
    recommended: true,
    other: true,
  });

  const toggleSection = (category: VaccineCategory) => {
    setExpandedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["vaccinations", pet.id] }),
      queryClient.invalidateQueries({ queryKey: ["vaccineRequirements", pet.country, pet.animal_type] }),
      queryClient.invalidateQueries({ queryKey: ["vaccineEquivalencies"] }),
    ]);
    setRefreshing(false);
  }, [queryClient, pet.id, pet.country, pet.animal_type]);

  useFocusEffect(
    React.useCallback(() => {
      // Refetch vaccinations when screen comes into focus
      queryClient.invalidateQueries({ queryKey: ["vaccinations", pet.id] });
    }, [queryClient, pet.id])
  );

  if (isLoading || isLoadingRequirements) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (vaccinations.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
        >
          <MaterialCommunityIcons name="needle" size={24} color={theme.primary} />
        </View>
        <Text
          className="text-xl font-semibold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No vaccines recorded yet
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          Upload your pet's vaccine certificate to get started
        </Text>
      </View>
    );
  }

  const { required, recommended, other } = categorizedVaccinations;

  // Define section order
  const sections: { category: VaccineCategory; items: typeof required }[] = [
    { category: "required", items: required },
    { category: "recommended", items: recommended },
    { category: "other", items: other },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1 pt-4"
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
        {/* Vaccination Status Header */}
        <VaccinationStatusHeader status={requiredVaccinesStatus} />

        {/* Vaccination Sections */}
        <View className="px-4">
          {sections.map(({ category, items }) => {
            // Skip empty sections
            if (items.length === 0) return null;

            return (
              <View key={category} className="mb-4">
                {/* Section Header */}
                <VaccinationSectionHeader
                  category={category}
                  count={items.length}
                  isExpanded={expandedSections[category]}
                  onToggle={() => toggleSection(category)}
                />

                {/* Section Content */}
                {expandedSections[category] && (
                  <View className="px-2">
                    {items.map((item) => (
                      <VaccinationCard
                        key={item.vaccination.id}
                        vaccination={item.vaccination}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
