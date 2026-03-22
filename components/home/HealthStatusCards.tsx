import {
  FIGMA_HEALTH_MEDS_ICON_BG,
  FIGMA_HEALTH_TEAL,
} from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type HealthStatusCardsProps = {
  petId: string;
  vaccineStatus: string;
  medsStatus: string;
};

export default function HealthStatusCards({
  petId,
  vaccineStatus,
  medsStatus,
}: HealthStatusCardsProps) {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-row gap-3 px-4">
      {/* Vaccines Card */}
      <TouchableOpacity
        className="flex-1 flex-row items-center rounded-2xl p-4"
        style={{
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}
        onPress={() =>
          router.push(`/(home)/health-record/${petId}/(tabs)/vaccinations`)
        }
        activeOpacity={0.7}
      >
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: FIGMA_HEALTH_TEAL }}
        >
          <MaterialCommunityIcons name="heart-pulse" size={22} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text
            className="text-xs font-semibold tracking-wider mb-0.5"
            style={{ color: theme.secondary }}
          >
            VACCINES
          </Text>
          <Text
            className="text-sm font-bold"
            style={{ color: theme.foreground }}
          >
            {vaccineStatus}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
      </TouchableOpacity>

      {/* Meds Card */}
      <TouchableOpacity
        className="flex-1 flex-row items-center rounded-2xl p-4"
        style={{
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}
        onPress={() =>
          router.push(`/(home)/health-record/${petId}/(tabs)/medications`)
        }
        activeOpacity={0.7}
      >
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: FIGMA_HEALTH_MEDS_ICON_BG }}
        >
          <MaterialCommunityIcons name="pill" size={22} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text
            className="text-xs font-semibold tracking-wider mb-0.5"
            style={{ color: theme.secondary }}
          >
            MEDS
          </Text>
          <Text
            className="text-sm font-bold"
            style={{ color: theme.foreground }}
          >
            {medsStatus}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
      </TouchableOpacity>
    </View>
  );
}

