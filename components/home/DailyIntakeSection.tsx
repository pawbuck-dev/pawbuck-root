import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type DailyIntakeSectionProps = {
  petId: string;
};

// Circular progress indicator for intake tracking
const IntakeProgressCircle = ({
  progress,
  color,
  icon,
  size = 72,
  strokeWidth = 6,
}: {
  progress: number; // 0-100
  color: string;
  icon: React.ReactNode;
  size?: number;
  strokeWidth?: number;
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
          stroke="rgba(255, 255, 255, 0.1)"
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

  // State for daily intake tracking (in a real app, this would come from a database)
  const [waterIntake, setWaterIntake] = useState(3);
  const waterTarget = 6;
  const [foodIntake, setFoodIntake] = useState(2);
  const foodTarget = 3;

  const waterProgress = (waterIntake / waterTarget) * 100;
  const foodProgress = (foodIntake / foodTarget) * 100;

  const handleWaterIncrement = () => {
    if (waterIntake < waterTarget) {
      setWaterIntake(waterIntake + 1);
    }
  };

  const handleWaterDecrement = () => {
    if (waterIntake > 0) {
      setWaterIntake(waterIntake - 1);
    }
  };

  const handleFoodIncrement = () => {
    if (foodIntake < foodTarget) {
      setFoodIntake(foodIntake + 1);
    }
  };

  const handleFoodDecrement = () => {
    if (foodIntake > 0) {
      setFoodIntake(foodIntake - 1);
    }
  };

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
            <Ionicons name="remove" size={20} color={theme.foreground} />
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
            <Ionicons name="remove" size={20} color={theme.foreground} />
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
    </View>
  );
}

