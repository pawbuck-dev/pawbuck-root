import { useTheme } from "@/context/themeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import moment from "moment";
import DailyIntakeConfigModal from "./DailyIntakeConfigModal";

type DailyIntakeSectionProps = {
  petId: string;
};

type DailyIntakeData = {
  waterIntake: number;
  foodIntake: number;
  waterTarget: number;
  foodTarget: number;
  lastResetDate: string; // YYYY-MM-DD format
};

const STORAGE_KEY_PREFIX = "daily_intake_";
const DEFAULT_WATER_TARGET = 6;
const DEFAULT_FOOD_TARGET = 3;

// Circular progress indicator for intake tracking
const IntakeProgressCircle = ({
  progress,
  color,
  icon,
  size = 72,
  strokeWidth = 6,
  isLightMode = false,
}: {
  progress: number; // 0-100
  color: string;
  icon: React.ReactNode;
  size?: number;
  strokeWidth?: number;
  isLightMode?: boolean;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isLightMode ? "#E5E7EB" : "rgba(255, 255, 255, 0.1)"}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Icon in center */}
      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
    </View>
  );
};

export default function DailyIntakeSection({ petId }: DailyIntakeSectionProps) {
  const { theme, mode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [waterIntake, setWaterIntake] = useState(0);
  const [foodIntake, setFoodIntake] = useState(0);
  const [waterTarget, setWaterTarget] = useState(DEFAULT_WATER_TARGET);
  const [foodTarget, setFoodTarget] = useState(DEFAULT_FOOD_TARGET);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${petId}`;

  // Check if we need to reset for a new day
  const checkAndResetDaily = useCallback(async () => {
    try {
      const today = moment().format("YYYY-MM-DD");
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const data: DailyIntakeData = JSON.parse(stored);
        
        // If last reset was not today, reset the intake values but keep targets
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
          return resetData;
        } else {
          // Same day, load existing data
          setWaterIntake(data.waterIntake || 0);
          setFoodIntake(data.foodIntake || 0);
          setWaterTarget(data.waterTarget || DEFAULT_WATER_TARGET);
          setFoodTarget(data.foodTarget || DEFAULT_FOOD_TARGET);
          return data;
        }
      } else {
        // No data exists, initialize with defaults
        const initialData: DailyIntakeData = {
          waterIntake: 0,
          foodIntake: 0,
          waterTarget: DEFAULT_WATER_TARGET,
          foodTarget: DEFAULT_FOOD_TARGET,
          lastResetDate: today,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(initialData));
        setWaterIntake(0);
        setFoodIntake(0);
        setWaterTarget(DEFAULT_WATER_TARGET);
        setFoodTarget(DEFAULT_FOOD_TARGET);
        return initialData;
      }
    } catch (error) {
      console.error("Error checking/resetting daily intake:", error);
      return null;
    }
  }, [storageKey]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await checkAndResetDaily();
      setLoading(false);
    };
    loadData();
  }, [checkAndResetDaily]);

  // Save to storage when values change
  const saveToStorage = useCallback(async (water: number, food: number, waterTgt?: number, foodTgt?: number) => {
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
  }, [storageKey, waterTarget, foodTarget]);

  const handleWaterIncrement = async () => {
    if (waterIntake < waterTarget) {
      const newValue = waterIntake + 1;
      setWaterIntake(newValue);
      await saveToStorage(newValue, foodIntake);
    }
  };

  const handleWaterDecrement = async () => {
    if (waterIntake > 0) {
      const newValue = waterIntake - 1;
      setWaterIntake(newValue);
      await saveToStorage(newValue, foodIntake);
    }
  };

  const handleFoodIncrement = async () => {
    if (foodIntake < foodTarget) {
      const newValue = foodIntake + 1;
      setFoodIntake(newValue);
      await saveToStorage(waterIntake, newValue);
    }
  };

  const handleFoodDecrement = async () => {
    if (foodIntake > 0) {
      const newValue = foodIntake - 1;
      setFoodIntake(newValue);
      await saveToStorage(waterIntake, newValue);
    }
  };

  // Update targets (configurable)
  const handleUpdateTargets = useCallback(async (newWaterTarget: number, newFoodTarget: number) => {
    setWaterTarget(newWaterTarget);
    setFoodTarget(newFoodTarget);
    // Save targets with current intake values
    await saveToStorage(waterIntake, foodIntake, newWaterTarget, newFoodTarget);
  }, [waterIntake, foodIntake, saveToStorage]);

  const waterProgress = waterTarget > 0 ? (waterIntake / waterTarget) * 100 : 0;
  const foodProgress = foodTarget > 0 ? (foodIntake / foodTarget) * 100 : 0;

  if (loading) {
    return (
      <View className="px-4 mb-6">
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View className="px-4 mb-6">
      {/* Section Header */}
      <View className="flex-row items-center mb-4">
        <Ionicons
          name="water"
          size={20}
          color={mode === "dark" ? "#3BD0D2" : "#2BA3A3"}
          style={{ marginRight: 8 }}
        />
        <View className="flex-1">
          <Text
            className="text-xl font-bold"
            style={{ color: theme.foreground }}
          >
            Daily Intake
          </Text>
          <Text
            className="text-sm"
            style={{ color: theme.secondary }}
          >
            Track food & water
          </Text>
        </View>
        {/* Settings button to configure targets */}
        <TouchableOpacity
          onPress={() => setShowConfigModal(true)}
          className="w-8 h-8 items-center justify-center"
        >
          <Ionicons name="settings-outline" size={20} color={theme.secondary} />
        </TouchableOpacity>
      </View>

      {/* Water Tracking Card */}
      <View
        className="flex-row items-center rounded-2xl p-4 mb-3"
        style={{
          backgroundColor: mode === "dark" ? "#1A2026" : theme.card,
          borderWidth: 1,
          borderColor: mode === "dark" ? "#325C60" : theme.border,
        }}
      >
        {/* Progress Circle */}
        <IntakeProgressCircle
          progress={waterProgress}
          color="#3B82F6" // Blue for water
          icon={
            <Ionicons name="water" size={28} color="#3B82F6" />
          }
          size={72}
          isLightMode={mode === "light"}
        />

        {/* Text Content */}
        <View className="flex-1 ml-4">
          <Text
            className="text-base font-bold"
            style={{ color: theme.foreground }}
          >
            Water
          </Text>
          <Text
            className="text-sm mt-1"
            style={{ color: theme.secondary }}
          >
            {waterIntake}/{waterTarget} bowls
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={handleWaterDecrement}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: mode === "dark" ? "#2A3441" : theme.border,
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="remove" 
              size={20} 
              color={mode === "dark" ? theme.foreground : "#4B5563"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWaterIncrement}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: mode === "dark" ? "#2A3441" : theme.border,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Food Tracking Card */}
      <View
        className="flex-row items-center rounded-2xl p-4"
        style={{
          backgroundColor: mode === "dark" ? "#1A2026" : theme.card,
          borderWidth: 1,
          borderColor: mode === "dark" ? "#325C60" : theme.border,
        }}
      >
        {/* Progress Circle */}
        <IntakeProgressCircle
          progress={foodProgress}
          color="#F97316" // Orange for food
          icon={
            <MaterialCommunityIcons name="silverware-fork-knife" size={28} color="#F97316" />
          }
          size={72}
          isLightMode={mode === "light"}
        />

        {/* Text Content */}
        <View className="flex-1 ml-4">
          <Text
            className="text-base font-bold"
            style={{ color: theme.foreground }}
          >
            Food
          </Text>
          <Text
            className="text-sm mt-1"
            style={{ color: theme.secondary }}
          >
            {foodIntake}/{foodTarget} meals
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={handleFoodDecrement}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: mode === "dark" ? "#2A3441" : theme.border,
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="remove" 
              size={20} 
              color={mode === "dark" ? theme.foreground : "#4B5563"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFoodIncrement}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: mode === "dark" ? "#2A3441" : theme.border,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#F97316" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Configuration Modal */}
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
