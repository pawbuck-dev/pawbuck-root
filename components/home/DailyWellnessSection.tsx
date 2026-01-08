import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { calculateVaccinationProgress, getVaccinationAlertPeriod } from "@/utils/vaccinationAlertPeriods";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import moment from "moment";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

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
  strokeWidth = 4.5,
  isDarkMode = false,
}: {
  progress: number; // 0-100
  color: string;
  iconColor: string;
  daysLeft: number;
  size?: number;
  strokeWidth?: number;
  isDarkMode?: boolean;
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
          stroke={isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}
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
            fontSize: size * 0.3,
            fontWeight: "600",
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

  const isDarkMode = mode === "dark";

  // Don't render if no upcoming vaccinations
  if (upcomingVaccinations.length === 0) {
    return null;
  }

  return (
    <View className="px-4">
      {/* Upcoming Vaccinations Card */}
      <TouchableOpacity
        onPress={() => {
          try {
            router.push(`/(home)/health-record/${petId}/(tabs)/vaccinations`);
          } catch (e) {
            console.warn("Navigation not ready");
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isDarkMode 
            ? ["rgba(28, 33, 40, 0.8)", "rgba(28, 33, 40, 0.4)"]  // dark card #1C2128
            : ["rgba(255, 255, 255, 0.4)", "rgba(255, 255, 255, 0.8)"]}  // light card #EEF4F4 hsl(180, 15%, 95%)
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 20,
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: theme.border,
            // Shadow for iOS - matches Tailwind shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            // Shadow for Android
            elevation: 10,
          }}
        >
        {/* Card Header */}
        <View className="flex-row items-center mb-5">
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: isDarkMode ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7" }}
          >
            <MaterialCommunityIcons name="needle" size={24} color="#F59E0B" />
          </View>
          <View>
            <Text
              className="text-base font-bold"
              style={{ color: theme.foreground }}
            >
              Upcoming Vaccinations
            </Text>
            <Text
              className="text-xs"
              style={{ color: theme.secondary }}
            >
              Next due dates
            </Text>
          </View>
        </View>

        {/* Vaccination Progress Circles */}
        <View className="flex-row justify-around">
          {upcomingVaccinations.map((vac, index) => {
            const color = getVaccinationColor(index);
            return (
              <View key={vac.id} className="items-center flex-1">
                <VaccinationProgressCircle
                  progress={vac.progress}
                  color={color}
                  iconColor={color}
                  daysLeft={vac.daysLeft}
                  size={60}
                  isDarkMode={isDarkMode}
                />
                <Text
                  className="text-xs font-semibold mt-3 text-center"
                  style={{ color: theme.foreground }}
                  numberOfLines={1}
                >
                  {vac.name}
                </Text>
                <Text
                  className="text-xs mt-0.5 text-center"
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
              </View>
            );
          })}
        </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

