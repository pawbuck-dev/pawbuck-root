import { LabResultCard } from "@/components/lab-results/LabResultCard";
import { useLabResults } from "@/context/labResultsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import {
  FIGMA_HEALTH_LABS_ICON_BG,
  healthRecordTabCanvas,
} from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

export default function LabResultsScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const listCanvas = healthRecordTabCanvas(theme, isDark);
  const { pet } = useSelectedPet();
  const { labResults, isLoading, error } = useLabResults();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!pet) return;
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["labResults", pet.id] });
    setRefreshing(false);
  }, [queryClient, pet]);

  useFocusEffect(
    React.useCallback(() => {
      if (!pet) return;
      queryClient.invalidateQueries({ queryKey: ["labResults", pet.id] });
    }, [queryClient, pet])
  );

  if (!pet) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: listCanvas }}>
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
        <Text className="mt-4 text-base" style={{ color: theme.secondary }}>
          Loading lab results...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: listCanvas }}
      >
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text
          className="text-lg font-semibold mt-4 text-center"
          style={{ color: theme.foreground }}
        >
          Failed to load lab results
        </Text>
        <Text
          className="text-sm text-center mt-2"
          style={{ color: theme.secondary }}
        >
          {error.message}
        </Text>
      </View>
    );
  }

  if (labResults.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: listCanvas, paddingBottom: 120 }}
      >
        <View
          className="w-28 h-28 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: FIGMA_HEALTH_LABS_ICON_BG }}
        >
          <Ionicons name="flask" size={40} color="#FFFFFF" />
        </View>
        <Text
          className="text-xl font-bold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No Labs Results Yet
        </Text>
        <Text
          className="text-sm text-center leading-5"
          style={{ color: theme.secondary }}
        >
          Lab test results for your pet will appear here. Tap + to upload a lab report.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: listCanvas }}>
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
        <Text className="text-base font-bold mb-3" style={{ color: theme.foreground }}>
          Recent Activity
        </Text>
        {labResults.map((labResult) => (
          <LabResultCard key={labResult.id} labResult={labResult} />
        ))}

        <View className="h-28" />
      </ScrollView>
    </View>
  );
}
