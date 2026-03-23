import { MedicineCard } from "@/components/medicines/MedicineCard";
import {
  FIGMA_HEALTH_MEDS_ICON_BG,
  healthRecordTabCanvas,
} from "@/constants/figmaHealthLayout";
import { useMedicines } from "@/context/medicinesContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { MedicineData } from "@/types/medication";
import { getMedicineListStatus } from "@/utils/medicineUi";
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

export default function MedicationsScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const listCanvas = healthRecordTabCanvas(theme, isDark);
  const { pet } = useSelectedPet();
  const { medicines, isLoading } = useMedicines();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const groupedMedicines = useMemo(() => {
    const active: MedicineData[] = [];
    const completed: MedicineData[] = [];
    medicines.forEach((medicine) => {
      if (getMedicineListStatus(medicine) === "active") {
        active.push(medicine);
      } else {
        completed.push(medicine);
      }
    });
    return { active, completed };
  }, [medicines]);

  const onRefresh = useCallback(async () => {
    if (!pet) return;
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
    setRefreshing(false);
  }, [queryClient, pet]);

  useFocusEffect(
    React.useCallback(() => {
      if (!pet) return;
      queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
    }, [queryClient, pet])
  );

  if (!pet) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: listCanvas }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (medicines.length === 0) {
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
              backgroundColor: FIGMA_HEALTH_MEDS_ICON_BG,
            }}
          >
            <MaterialCommunityIcons name="pill" size={56} color="#FFFFFF" />
          </View>
          <Text
            className="text-xl font-bold mb-2 text-center"
            style={{ color: theme.foreground }}
          >
            No Medications Recorded Yet
          </Text>
          <Text
            className="text-sm text-center leading-5"
            style={{ maxWidth: 320, color: theme.secondary }}
          >
            Add your pet&apos;s current medications and prescriptions. Tap + to upload or add manually.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const sectionTitleStyle = {
    fontSize: 17 as const,
    fontWeight: "700" as const,
    color: theme.foreground,
    marginBottom: 12,
    marginTop: 4 as const,
  };

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
          {groupedMedicines.active.length > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={sectionTitleStyle}>Active Medications</Text>
              {groupedMedicines.active.map((m) => (
                <MedicineCard key={m.id} medicine={m} listStatus="active" />
              ))}
            </View>
          ) : null}

          {groupedMedicines.completed.length > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={sectionTitleStyle}>Completed Medications</Text>
              {groupedMedicines.completed.map((m) => (
                <MedicineCard key={m.id} medicine={m} listStatus="completed" />
              ))}
            </View>
          ) : null}
        </View>

        <View className="h-28" />
      </ScrollView>
    </View>
  );
}
