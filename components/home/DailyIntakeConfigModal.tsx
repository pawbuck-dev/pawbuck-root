import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type DailyIntakeConfigModalProps = {
  visible: boolean;
  onClose: () => void;
  petId: string;
  currentWaterTarget: number;
  currentFoodTarget: number;
  onSave: (waterTarget: number, foodTarget: number) => void;
};

const STORAGE_KEY_PREFIX = "daily_intake_";

export default function DailyIntakeConfigModal({
  visible,
  onClose,
  petId,
  currentWaterTarget,
  currentFoodTarget,
  onSave,
}: DailyIntakeConfigModalProps) {
  const { theme, mode } = useTheme();
  const [waterTarget, setWaterTarget] = useState(String(currentWaterTarget));
  const [foodTarget, setFoodTarget] = useState(String(currentFoodTarget));

  useEffect(() => {
    if (visible) {
      setWaterTarget(String(currentWaterTarget));
      setFoodTarget(String(currentFoodTarget));
    }
  }, [visible, currentWaterTarget, currentFoodTarget]);

  const handleSave = () => {
    const water = parseInt(waterTarget, 10);
    const food = parseInt(foodTarget, 10);

    if (isNaN(water) || water < 1 || water > 50) {
      // Show error or handle validation
      return;
    }
    if (isNaN(food) || food < 1 || food > 20) {
      // Show error or handle validation
      return;
    }

    onSave(water, food);
    onClose();
  };

  const handlePreset = (water: number, food: number) => {
    setWaterTarget(String(water));
    setFoodTarget(String(food));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={onClose}
          />
          <View
            className="rounded-t-3xl px-6 pt-6 pb-8"
            style={{
              backgroundColor: mode === "dark" ? "#1A2026" : theme.card,
              maxHeight: "80%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text
                  className="text-2xl font-bold"
                  style={{ color: theme.foreground }}
                >
                  Configure Daily Intake Targets
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Quick Presets */}
              <View className="mb-6">
                <Text
                  className="text-sm font-semibold mb-3"
                  style={{ color: theme.secondary }}
                >
                  Quick Presets
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => handlePreset(4, 2)}
                    className="flex-1 py-3 px-4 rounded-xl border"
                    style={{
                      backgroundColor:
                        mode === "dark" ? "#2A3441" : theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      className="text-center font-semibold"
                      style={{ color: theme.foreground }}
                    >
                      Small
                    </Text>
                    <Text
                      className="text-xs text-center mt-1"
                      style={{ color: theme.secondary }}
                    >
                      4 water, 2 meals
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePreset(6, 3)}
                    className="flex-1 py-3 px-4 rounded-xl border"
                    style={{
                      backgroundColor:
                        mode === "dark" ? "#2A3441" : theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      className="text-center font-semibold"
                      style={{ color: theme.foreground }}
                    >
                      Medium
                    </Text>
                    <Text
                      className="text-xs text-center mt-1"
                      style={{ color: theme.secondary }}
                    >
                      6 water, 3 meals
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePreset(8, 4)}
                    className="flex-1 py-3 px-4 rounded-xl border"
                    style={{
                      backgroundColor:
                        mode === "dark" ? "#2A3441" : theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      className="text-center font-semibold"
                      style={{ color: theme.foreground }}
                    >
                      Large
                    </Text>
                    <Text
                      className="text-xs text-center mt-1"
                      style={{ color: theme.secondary }}
                    >
                      8 water, 4 meals
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Custom Input */}
              <View className="mb-6">
                <Text
                  className="text-sm font-semibold mb-4"
                  style={{ color: theme.secondary }}
                >
                  Custom Targets
                </Text>

                {/* Water Target */}
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="water"
                      size={20}
                      color="#3B82F6"
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.foreground }}
                    >
                      Water (bowls per day)
                    </Text>
                  </View>
                  <TextInput
                    value={waterTarget}
                    onChangeText={setWaterTarget}
                    keyboardType="number-pad"
                    placeholder="Enter target"
                    placeholderTextColor={theme.secondary}
                    className="py-3 px-4 rounded-xl border text-base"
                    style={{
                      backgroundColor:
                        mode === "dark" ? "#2A3441" : theme.background,
                      borderColor: theme.border,
                      color: theme.foreground,
                    }}
                  />
                  <Text
                    className="text-xs mt-1"
                    style={{ color: theme.secondary }}
                  >
                    Recommended: 4-10 bowls per day
                  </Text>
                </View>

                {/* Food Target */}
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="restaurant"
                      size={20}
                      color="#F97316"
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.foreground }}
                    >
                      Food (meals per day)
                    </Text>
                  </View>
                  <TextInput
                    value={foodTarget}
                    onChangeText={setFoodTarget}
                    keyboardType="number-pad"
                    placeholder="Enter target"
                    placeholderTextColor={theme.secondary}
                    className="py-3 px-4 rounded-xl border text-base"
                    style={{
                      backgroundColor:
                        mode === "dark" ? "#2A3441" : theme.background,
                      borderColor: theme.border,
                      color: theme.foreground,
                    }}
                  />
                  <Text
                    className="text-xs mt-1"
                    style={{ color: theme.secondary }}
                  >
                    Recommended: 2-4 meals per day
                  </Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                className="py-4 rounded-xl"
                style={{ backgroundColor: theme.primary }}
                activeOpacity={0.8}
              >
                <Text
                  className="text-center text-base font-bold"
                  style={{ color: theme.primaryForeground }}
                >
                  Save Targets
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

