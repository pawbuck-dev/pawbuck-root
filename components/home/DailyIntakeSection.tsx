import { useTheme } from "@/context/themeContext";
import { DailyIntake, getDailyIntake, updateDailyIntake } from "@/services/dailyIntake";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import DailyIntakeConfigModal from "./DailyIntakeConfigModal";

type DailyIntakeSectionProps = {
  petId: string;
};

const IconRow = ({
  count,
  total,
  filledColor,
  emptyColor,
  icon,
}: {
  count: number;
  total: number;
  filledColor: string;
  emptyColor: string;
  icon: "paw" | "water";
}) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginVertical: 8 }}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i}>
        {icon === "paw" ? (
          <MaterialCommunityIcons
            name="paw"
            size={18}
            color={i < count ? filledColor : emptyColor}
          />
        ) : (
          <Ionicons
            name="water"
            size={18}
            color={i < count ? filledColor : emptyColor}
          />
        )}
      </View>
    ))}
  </View>
);

export default function DailyIntakeSection({ petId }: DailyIntakeSectionProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [showConfigModal, setShowConfigModal] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ["daily_intake", petId];

  const { data: intake, isLoading } = useQuery({
    queryKey,
    queryFn: () => getDailyIntake(petId),
    enabled: !!petId,
  });

  const mutation = useMutation({
    mutationFn: (updates: Partial<Pick<DailyIntake, "food_intake" | "water_intake" | "food_target" | "water_target">>) =>
      updateDailyIntake(petId, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DailyIntake>(queryKey);
      if (previous) {
        queryClient.setQueryData<DailyIntake>(queryKey, { ...previous, ...updates });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const foodIntake = intake?.food_intake ?? 0;
  const waterIntake = intake?.water_intake ?? 0;
  const foodTarget = intake?.food_target ?? 4;
  const waterTarget = intake?.water_target ?? 6;

  const handleFoodIncrement = () => {
    if (foodIntake < foodTarget) mutation.mutate({ food_intake: foodIntake + 1 });
  };
  const handleFoodDecrement = () => {
    if (foodIntake > 0) mutation.mutate({ food_intake: foodIntake - 1 });
  };
  const handleWaterIncrement = () => {
    if (waterIntake < waterTarget) mutation.mutate({ water_intake: waterIntake + 1 });
  };
  const handleWaterDecrement = () => {
    if (waterIntake > 0) mutation.mutate({ water_intake: waterIntake - 1 });
  };

  const handleUpdateTargets = useCallback(
    (newWaterTarget: number, newFoodTarget: number) => {
      mutation.mutate({ food_target: newFoodTarget, water_target: newWaterTarget });
    },
    [mutation]
  );

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const isAndroid = Platform.OS === "android";
  const cardBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };
  const btnBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Section header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground }}>
          Daily Intake
        </Text>
        <TouchableOpacity onPress={() => setShowConfigModal(true)}>
          <Ionicons name="settings-outline" size={20} color={theme.secondary} />
        </TouchableOpacity>
      </View>

      {/* Two cards side by side */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Food Card */}
        <View
          style={{
            flex: 1,
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 14,
            ...cardBorderStyle,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MaterialCommunityIcons name="food-drumstick" size={20} color="#F97316" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground }}>Food</Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.secondary, marginBottom: 4 }}>
            {foodIntake}/{foodTarget} meals daily
          </Text>
          <IconRow
            count={foodIntake}
            total={foodTarget}
            filledColor="#F97316"
            emptyColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}
            icon="paw"
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: theme.secondary }}>
              {foodIntake}/{foodTarget} meals
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={handleFoodDecrement}
                style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: btnBg }}
              >
                <Ionicons name="remove" size={16} color={theme.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFoodIncrement}
                style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(249,115,22,0.15)" }}
              >
                <Ionicons name="add" size={16} color="#F97316" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Water Card */}
        <View
          style={{
            flex: 1,
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 14,
            ...cardBorderStyle,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Ionicons name="water" size={20} color="#3B82F6" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground }}>Water</Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.secondary, marginBottom: 4 }}>
            {waterIntake}/{waterTarget} cups daily
          </Text>
          <IconRow
            count={waterIntake}
            total={waterTarget}
            filledColor="#3B82F6"
            emptyColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}
            icon="water"
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: theme.secondary }}>
              {waterIntake}/{waterTarget} cups
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={handleWaterDecrement}
                style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: btnBg }}
              >
                <Ionicons name="remove" size={16} color={theme.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleWaterIncrement}
                style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(59,130,246,0.15)" }}
              >
                <Ionicons name="add" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <DailyIntakeConfigModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        petId={petId}
        currentWaterTarget={waterTarget}
        currentFoodTarget={foodTarget}
        onSave={handleUpdateTargets}
      />
    </View>
  );
}
