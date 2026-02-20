import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ManualEntryButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const ManualEntryButton: React.FC<ManualEntryButtonProps> = ({
  onPress,
  disabled = false,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      className="flex-row items-center p-4 rounded-xl"
      style={{ backgroundColor: theme.card }}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
      >
        <Ionicons name="create-outline" size={24} color={theme.primary} />
      </View>
      <View className="flex-1">
        <Text
          className="text-base font-semibold"
          style={{ color: theme.foreground }}
        >
          Add Manually
        </Text>
        <Text className="text-sm" style={{ color: theme.secondary }}>
          Enter medication details manually
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
    </TouchableOpacity>
  );
};

