import { RiceBowlIcon, WaterGlassIcon } from "@/components/icons";
import { useTheme } from "@/context/themeContext";
import { DailyIntake, getDailyIntake, updateDailyIntake } from "@/services/dailyIntake";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import DailyIntakeConfigModal from "./DailyIntakeConfigModal";

type DailyIntakeSectionProps = {
  petId: string;
};

const ProgressIcons = ({
  count,
  total,
  filledColor,
  emptyColor,
  type,
}: {
  count: number;
  total: number;
  filledColor: string;
  emptyColor: string;
  type: "food" | "water";
}) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 12, justifyContent: "center" }}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i}>
        {type === "food" ? (
          <RiceBowlIcon size={28} color={i < count ? filledColor : emptyColor} />
        ) : (
          <WaterGlassIcon size={28} filled={i < count} color="#93C5FD" />
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
        <Text style={{ fontSize: 18, fontWeight: "500", color: isDark ? "#FFFFFF" : "#0D0F0F", lineHeight: 21.6, textTransform: "capitalize" }}>
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
            paddingHorizontal: 14,
            paddingTop: 16,
            paddingBottom: 14,
            ...cardBorderStyle,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <RiceBowlIcon size={22} color={isDark ? theme.foreground : "#1D2433"} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Food</Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2, marginLeft: 30 }}>
            {foodIntake * 150}g/{foodTarget * 150}g daily
          </Text>

          <ProgressIcons
            count={foodIntake}
            total={foodTarget}
            filledColor={isDark ? "#3BD0D2" : "#2BA89E"}
            emptyColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
            type="food"
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <TouchableOpacity
              onPress={handleFoodDecrement}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: btnBg }}
            >
              <Ionicons name="remove" size={18} color={theme.foreground} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>
              {foodIntake}/{foodTarget} meals
            </Text>
            <TouchableOpacity
              onPress={handleFoodIncrement}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: btnBg }}
            >
              <Ionicons name="add" size={18} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Water Card */}
        <View
          style={{
            flex: 1,
            backgroundColor: cardBg,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingTop: 16,
            paddingBottom: 14,
            ...cardBorderStyle,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="water-outline" size={22} color={isDark ? "#FFFFFF" : "#1D2433"} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Water</Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2, marginLeft: 30 }}>
            {waterIntake * 250}ml/{waterTarget * 250}ml daily
          </Text>

          <ProgressIcons
            count={waterIntake}
            total={waterTarget}
            filledColor={isDark ? "#60A5FA" : "#3B82F6"}
            emptyColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
            type="water"
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <TouchableOpacity
              onPress={handleWaterDecrement}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: btnBg }}
            >
              <Ionicons name="remove" size={18} color={theme.foreground} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>
              {waterIntake}/{waterTarget} cups
            </Text>
            <TouchableOpacity
              onPress={handleWaterIncrement}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: btnBg }}
            >
              <Ionicons name="add" size={18} color={theme.foreground} />
            </TouchableOpacity>
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
