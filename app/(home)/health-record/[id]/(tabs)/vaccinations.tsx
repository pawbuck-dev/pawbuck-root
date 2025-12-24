import { VaccinationCard } from "@/components/vaccinations/VaccinationCard";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

export default function VaccinationsScreen() {
  const { theme } = useTheme();
  const { vaccinations, isLoading } = useVaccinations();
  const { pet } = useSelectedPet();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["vaccinations", pet.id] });
    setRefreshing(false);
  }, [queryClient, pet.id]);

useFocusEffect(
  React.useCallback(() => {
    // Refetch vaccinations when screen comes into focus
    queryClient.invalidateQueries({ queryKey: ["vaccinations", pet.id] });
  }, [queryClient, pet.id])
);

  if (isLoading) {
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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1 px-6 pt-4"
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
        {vaccinations.map((vaccination) => (
          <VaccinationCard key={vaccination.id} vaccination={vaccination} />
        ))}

        <View className="h-20" />
      </ScrollView>

      {/* Review Modal
      {showReviewModal && (
        <VaccinationReviewModal
          visible={showReviewModal}
          onClose={handleCloseReviewModal}
          onSave={handleSaveVaccination}
          initialData={extractedData}
          documentUri={selectedImage || undefined}
          loading={isSaving}
        />
      )} */}

      {/* Processing Overlay */}
      {/* {isProcessing && (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
        >
          <View
            className="p-6 rounded-2xl items-center"
            style={{ backgroundColor: theme.card }}
          >
            <ActivityIndicator size="large" color={theme.primary} />
            <Text
              className="text-base font-semibold mt-4"
              style={{ color: theme.foreground }}
            >
              Processing Document...
            </Text>
            <Text
              className="text-sm mt-2 text-center"
              style={{ color: theme.secondary }}
            >
              Extracting vaccination information
            </Text>
          </View>
        </View>
      )} */}
    </View>
  );
}
