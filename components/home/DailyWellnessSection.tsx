import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type DailyWellnessSectionProps = {
  petId: string;
  vaccinations: Tables<"vaccinations">[];
};

// Circular progress indicator component
const VaccinationProgressCircle = ({
  progress,
  color,
  iconColor,
  size = 80,
  strokeWidth = 8,
}: {
  progress: number; // 0-100
  color: string;
  iconColor: string;
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
        <MaterialCommunityIcons name="needle" size={32} color={iconColor} />
      </View>
    </View>
  );
};

export default function DailyWellnessSection({
  petId,
  vaccinations,
}: DailyWellnessSectionProps) {
  const { theme, mode } = useTheme();
  const router = useRouter();

  // Get upcoming vaccinations with days left and progress
  const upcomingVaccinations = useMemo(() => {
    const now = moment();
    return vaccinations
      .filter((vac) => {
        if (!vac.next_due_date) return false;
        const dueDate = moment(vac.next_due_date);
        // Include vaccinations due in next 365 days
        return dueDate.isAfter(now) && dueDate.diff(now, "days") <= 365;
      })
      .map((vac) => {
        const dueDate = moment(vac.next_due_date!);
        const daysLeft = dueDate.diff(now, "days");
        // Progress: 0% = 365 days away, 100% = due today/overdue
        const progress = Math.max(0, Math.min(100, ((365 - daysLeft) / 365) * 100));
        return { ...vac, daysLeft, progress };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3); // Show top 3
  }, [vaccinations]);


  // Vaccination colors
  const getVaccinationColor = (index: number): string => {
    const colors = ["#F59E0B", "#3BD0D2", "#A855F7"]; // Orange, Teal, Purple
    return colors[index % colors.length];
  };

  return (
    <View className="px-4 mb-6">
      {/* Section Header */}
      <Text
        className="text-xl font-bold mb-4"
        style={{ color: theme.foreground }}
      >
        Daily Wellness
      </Text>

      {/* VACCINATION SCHEDULE Section */}
      {upcomingVaccinations.length > 0 && (
        <View className="mb-6">
          <Text
            className="text-xs font-semibold tracking-wider mb-3 uppercase"
            style={{ color: theme.secondary }}
          >
            VACCINATION SCHEDULE
          </Text>
          <View className="flex-row justify-between">
            {upcomingVaccinations.map((vac, index) => {
              const color = getVaccinationColor(index);
              return (
                <TouchableOpacity
                  key={vac.id}
                  className="items-center"
                  onPress={() =>
                    router.push(`/(home)/health-record/${petId}/(tabs)/vaccinations`)
                  }
                  activeOpacity={0.7}
                >
                  <VaccinationProgressCircle
                    progress={vac.progress}
                    color={color}
                    iconColor={color}
                    size={80}
                  />
                  <Text
                    className="text-sm font-semibold mt-2"
                    style={{ color: theme.foreground }}
                  >
                    {vac.name}
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: theme.secondary }}
                  >
                    {vac.daysLeft === 0
                      ? "Due today!"
                      : vac.daysLeft === 1
                      ? "1d left!"
                      : `${vac.daysLeft}d`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

    </View>
  );
}

