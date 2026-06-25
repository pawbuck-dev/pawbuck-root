import { DomainCategoryIconWell } from "@/components/ui/IconWell";
import RequiredVaccinesHubCard from "@/components/health/RequiredVaccinesHubCard";
import { VaccinationCard } from "@/components/vaccinations/VaccinationCard";
import {
  FIGMA_VACCINES_LIST_CANVAS_LIGHT,
  healthRecordTabCanvas,
} from "@/constants/figmaHealthLayout";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { useVaccineCategories } from "@/hooks/useVaccineCategories";
import { VaccineCategory } from "@/services/vaccineRequirements";
import { latestVaccinationIdSet } from "@/utils/vaccinationGrouping";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
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
  /** Figma 2082:213157 — light list canvas #F5F7F7; dark keeps tab well */
  const listCanvas = isDark ? healthRecordTabCanvas(theme, isDark) : FIGMA_VACCINES_LIST_CANVAS_LIGHT;
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

  const { required, recommended, other } = categorizedVaccinations;

  const latestVaccineRowIds = useMemo(
    () => latestVaccinationIdSet(vaccinations),
    [vaccinations]
  );

  const sections: { category: VaccineCategory; items: typeof required }[] = [
    { category: "required", items: required },
    { category: "recommended", items: recommended },
    { category: "other", items: other },
  ];

  const listEmpty = vaccinations.length === 0;

  return (
    <View className="flex-1" style={{ backgroundColor: listCanvas }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 120,
          flexGrow: listEmpty ? 1 : undefined,
        }}
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
        <View style={{ paddingHorizontal: 16 }}>
          <RequiredVaccinesHubCard petId={pet.id} hideViewInVaccinationsCta />

          {listEmpty ? (
            <View
              className="flex-1 items-center justify-center px-2"
              style={{ minHeight: 420 }}
            >
              <View className="mb-6">
                <DomainCategoryIconWell category="vaccines" size="hero" />
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
          ) : (
            sections.map(({ category, items }, sectionIndex) => {
              if (items.length === 0) return null;
              return (
                <View key={category} style={{ marginBottom: 22 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: theme.foreground,
                      marginBottom: 14,
                      marginTop: sectionIndex === 0 ? 0 : 6,
                      letterSpacing: -0.2,
                    }}
                  >
                    {SECTION_TITLE[category]}
                  </Text>
                  {items.map((item) => (
                    <VaccinationCard
                      key={item.vaccination.id}
                      vaccination={item.vaccination}
                      category={item.category}
                      isLatestAdministrationForVaccine={latestVaccineRowIds.has(item.vaccination.id)}
                    />
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
