import { MedicineCard } from "@/components/medicines/MedicineCard";
import { MedicationSectionHeader, MedicationStatus } from "@/components/medicines/MedicationSectionHeader";
import { useMedicines } from "@/context/medicinesContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { MedicineData } from "@/models/medication";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, LayoutAnimation, Platform, RefreshControl, ScrollView, Text, UIManager, View } from "react-native";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getMedicationStatus = (medicine: MedicineData): MedicationStatus => {
  const now = new Date();
  if (medicine.end_date) {
    const endDate = new Date(medicine.end_date);
    endDate.setHours(23, 59, 59, 999);
    if (endDate < now) {
      return "completed";
    }
  }
  return "active";
};

export default function MedicationsScreen() {
  const { theme } = useTheme();
  const { pet } = useSelectedPet();
  const { medicines, isLoading } = useMedicines();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Track expanded state for each section
  const [expandedSections, setExpandedSections] = useState<Record<MedicationStatus, boolean>>({
    active: false,
    completed: false,
  });

  const toggleSection = (status: MedicationStatus) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  // Group medicines by status
  const groupedMedicines = useMemo(() => {
    const active: MedicineData[] = [];
    const completed: MedicineData[] = [];

    medicines.forEach((medicine) => {
      const status = getMedicationStatus(medicine);
      if (status === "active") {
        active.push(medicine);
      } else {
        completed.push(medicine);
      }
    });

    return { active, completed };
  }, [medicines]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
    setRefreshing(false);
  }, [queryClient, pet.id]);

  useFocusEffect(
    React.useCallback(() => {
      // Refetch medicines when screen comes into focus
      queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
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

  if (medicines.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
        >
          <MaterialCommunityIcons name="pill" size={40} color={theme.primary} />
        </View>
        <Text
          className="text-xl font-semibold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No medications recorded yet
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          Add your pet's current medications and prescriptions
        </Text>
      </View>
    );
  }

  const sections: { status: MedicationStatus; items: MedicineData[] }[] = [
    { status: "active", items: groupedMedicines.active },
    { status: "completed", items: groupedMedicines.completed },
  ].filter((section) => section.items.length > 0);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1 px-4 pt-4"
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
        {sections.map(({ status, items }) => (
          <View key={status} className="mb-4">
            {/* Section Header */}
            <MedicationSectionHeader
              status={status}
              count={items.length}
              isExpanded={expandedSections[status]}
              onToggle={() => toggleSection(status)}
            />

            {/* Section Items */}
            {expandedSections[status] && (
              <View className="px-4">
                {items.map((medicine) => (
                  <MedicineCard key={medicine.id} medicine={medicine} />
                ))}
              </View>
            )}
          </View>
        ))}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
