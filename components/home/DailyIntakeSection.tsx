import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import DailyIntakeConfigModal from "./DailyIntakeConfigModal";

type DailyIntakeSectionProps = {
  petId: string;
};

type DailyIntakeData = {
  waterIntake: number;
  foodIntake: number;
  waterTarget: number;
  foodTarget: number;
  lastResetDate: string;
};

const STORAGE_KEY_PREFIX = "daily_intake_";
const DEFAULT_WATER_TARGET = 6;
const DEFAULT_FOOD_TARGET = 4;

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
  const [loading, setLoading] = useState(true);
  const [waterIntake, setWaterIntake] = useState(0);
  const [foodIntake, setFoodIntake] = useState(0);
  const [waterTarget, setWaterTarget] = useState(DEFAULT_WATER_TARGET);
  const [foodTarget, setFoodTarget] = useState(DEFAULT_FOOD_TARGET);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${petId}`;

  const checkAndResetDaily = useCallback(async () => {
    try {
      const today = moment().format("YYYY-MM-DD");
      const stored = await AsyncStorage.getItem(storageKey);

      if (stored) {
        const data: DailyIntakeData = JSON.parse(stored);
        if (data.lastResetDate !== today) {
          const resetData: DailyIntakeData = {
            waterIntake: 0,
            foodIntake: 0,
            waterTarget: data.waterTarget || DEFAULT_WATER_TARGET,
            foodTarget: data.foodTarget || DEFAULT_FOOD_TARGET,
            lastResetDate: today,
          };
          await AsyncStorage.setItem(storageKey, JSON.stringify(resetData));
          setWaterIntake(0);
          setFoodIntake(0);
          setWaterTarget(resetData.waterTarget);
          setFoodTarget(resetData.foodTarget);
        } else {
          setWaterIntake(data.waterIntake || 0);
          setFoodIntake(data.foodIntake || 0);
          setWaterTarget(data.waterTarget || DEFAULT_WATER_TARGET);
          setFoodTarget(data.foodTarget || DEFAULT_FOOD_TARGET);
        }
      } else {
        const initialData: DailyIntakeData = {
          waterIntake: 0,
          foodIntake: 0,
          waterTarget: DEFAULT_WATER_TARGET,
          foodTarget: DEFAULT_FOOD_TARGET,
          lastResetDate: today,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(initialData));
      }
    } catch (error) {
      console.error("Error checking/resetting daily intake:", error);
    }
  }, [storageKey]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await checkAndResetDaily();
      setLoading(false);
    };
    loadData();
  }, [checkAndResetDaily]);

  const saveToStorage = useCallback(
    async (water: number, food: number, waterTgt?: number, foodTgt?: number) => {
      try {
        const today = moment().format("YYYY-MM-DD");
        const data: DailyIntakeData = {
          waterIntake: water,
          foodIntake: food,
          waterTarget: waterTgt ?? waterTarget,
          foodTarget: foodTgt ?? foodTarget,
          lastResetDate: today,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.error("Error saving daily intake:", error);
      }
    },
    [storageKey, waterTarget, foodTarget]
  );

  const handleWaterIncrement = async () => {
    if (waterIntake < waterTarget) {
      const v = waterIntake + 1;
      setWaterIntake(v);
      await saveToStorage(v, foodIntake);
    }
  };
  const handleWaterDecrement = async () => {
    if (waterIntake > 0) {
      const v = waterIntake - 1;
      setWaterIntake(v);
      await saveToStorage(v, foodIntake);
    }
  };
  const handleFoodIncrement = async () => {
    if (foodIntake < foodTarget) {
      const v = foodIntake + 1;
      setFoodIntake(v);
      await saveToStorage(waterIntake, v);
    }
  };
  const handleFoodDecrement = async () => {
    if (foodIntake > 0) {
      const v = foodIntake - 1;
      setFoodIntake(v);
      await saveToStorage(waterIntake, v);
    }
  };

  const handleUpdateTargets = useCallback(
    async (newWaterTarget: number, newFoodTarget: number) => {
      setWaterTarget(newWaterTarget);
      setFoodTarget(newFoodTarget);
      await saveToStorage(waterIntake, foodIntake, newWaterTarget, newFoodTarget);
    },
    [waterIntake, foodIntake, saveToStorage]
  );

  if (loading) {
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
