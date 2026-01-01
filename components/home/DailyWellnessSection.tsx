import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { getVaccinationAlertPeriod, calculateVaccinationProgress } from "@/utils/vaccinationAlertPeriods";

type DailyWellnessSectionProps = {
  petId: string;
  vaccinations: Tables<"vaccinations">[];
  petCountry?: string | null;
};

// Circular progress indicator component
const VaccinationProgressCircle = ({
  progress,
  color,
  iconColor,
  daysLeft,
  size = 80,
  strokeWidth = 8,
}: {
  progress: number; // 0-100
  color: string;
  iconColor: string;
  daysLeft: number;
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
      {/* Number in center */}
      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            fontSize: size * 0.35,
            fontWeight: "bold",
            color: iconColor,
          }}
        >
          {daysLeft}
        </Text>
      </View>
    </View>
  );
};

export default function DailyWellnessSection({
  petId,
  vaccinations,
  petCountry,
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
        // Get alert period for this vaccine type
        const alertPeriodMonths = getVaccinationAlertPeriod(vac.name);
        const alertPeriodDays = alertPeriodMonths * 30; // Approximate month as 30 days
        // Include vaccinations due within their alert period
        return dueDate.isAfter(now) && dueDate.diff(now, "days") <= alertPeriodDays;
      })
      .map((vac) => {
        const dueDate = moment(vac.next_due_date!);
        const daysLeft = dueDate.diff(now, "days");
        // Get alert period for this vaccine type (considering regional requirements)
        const alertPeriodMonths = getVaccinationAlertPeriod(vac.name, petCountry);
        // Calculate progress based on the specific alert period for this vaccine
        const progress = calculateVaccinationProgress(daysLeft, alertPeriodMonths);
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
                    daysLeft={vac.daysLeft}
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
                      : vac.daysLeft < 30
                      ? `${vac.daysLeft}d left!`
                      : `${vac.daysLeft} days`}
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

