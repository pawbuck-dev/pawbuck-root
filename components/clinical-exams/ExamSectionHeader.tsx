import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export type ExamCategory = "Routine Checkup" | "Invoice" | "Travel";

interface ExamSectionHeaderProps {
  category: ExamCategory;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const SECTION_CONFIG: Record<
  ExamCategory,
  {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
  }
> = {
  "Routine Checkup": {
    title: "Routine Checkup",
    icon: "clipboard",
    color: "#60A5FA", // Blue
    bgColor: "rgba(96, 165, 250, 0.15)",
  },
  Invoice: {
    title: "Invoice",
    icon: "receipt",
    color: "#A855F7", // Purple
    bgColor: "rgba(168, 85, 247, 0.15)",
  },
  Travel: {
    title: "Travel",
    icon: "airplane",
    color: "#F59E0B", // Amber
    bgColor: "rgba(245, 158, 11, 0.15)",
  },
};

export const ExamSectionHeader: React.FC<ExamSectionHeaderProps> = ({
  category,
  count,
  isExpanded,
  onToggle,
}) => {
  const { theme } = useTheme();
  const config = SECTION_CONFIG[category];

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

