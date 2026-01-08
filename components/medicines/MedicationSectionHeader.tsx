import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export type MedicationStatus = "active" | "completed";

interface MedicationSectionHeaderProps {
  status: MedicationStatus;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const SECTION_CONFIG: Record<
  MedicationStatus,
  {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
  }
> = {
  active: {
    title: "Active Medications",
    icon: "medical",
    color: "#3BD0D2", // Teal (matches primary)
    bgColor: "rgba(59, 208, 210, 0.15)",
  },
  completed: {
    title: "Completed Medications",
    icon: "checkmark-circle",
    color: "#9CA3AF", // Gray
    bgColor: "rgba(156, 163, 175, 0.15)",
  },
};

export const MedicationSectionHeader: React.FC<MedicationSectionHeaderProps> = ({
  status,
  count,
  isExpanded,
  onToggle,
}) => {
  const { theme } = useTheme();
  const config = SECTION_CONFIG[status];

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-3 px-4 mb-2 rounded-xl"
      style={{ backgroundColor: theme.card }}
    >
      <View className="flex-row items-center flex-1">
        {/* Icon */}
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: config.bgColor }}
        >
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>

        {/* Title */}
        <Text
          className="text-base font-semibold flex-1"
          style={{ color: theme.foreground }}
        >
          {config.title}
        </Text>

        {/* Count Badge */}
        <View
          className="px-2.5 py-1 rounded-full mr-3"
          style={{ backgroundColor: config.bgColor }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: config.color }}
          >
            {count}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.secondary}
        />
      </View>
    </TouchableOpacity>
  );
};

