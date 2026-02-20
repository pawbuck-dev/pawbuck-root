import { LabResultCard } from "@/components/lab-results/LabResultCard";
import { useLabResults } from "@/context/labResultsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

export default function LabResultsScreen() {
  const { theme } = useTheme();
  const { pet } = useSelectedPet();
  const { labResults, isLoading, error } = useLabResults();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["labResults", pet.id] });
    setRefreshing(false);
  }, [queryClient, pet.id]);

  useFocusEffect(
    React.useCallback(() => {
      // Refetch lab results when screen comes into focus
      queryClient.invalidateQueries({ queryKey: ["labResults", pet.id] });
    }, [queryClient, pet.id])
  );

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
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
        style={{ backgroundColor: theme.background }}
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
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
        >
          <Ionicons name="flask" size={40} color={theme.primary} />
        </View>
        <Text
          className="text-xl font-semibold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No lab results yet
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          Lab test results will appear here
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
        {labResults.map((labResult) => (
          <LabResultCard key={labResult.id} labResult={labResult} />
        ))}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
