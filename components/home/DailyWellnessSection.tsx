import { useTheme } from "@/context/themeContext";
import { MedicineData } from "@/models/medication";
import { Tables } from "@/database.types";
import { getNextMedicationDose } from "@/utils/medication";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type DailyWellnessSectionProps = {
  petId: string;
  vaccinations: Tables<"vaccinations">[];
  medicines: MedicineData[];
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
  medicines,
}: DailyWellnessSectionProps) {
  const { theme, mode } = useTheme();
  const router = useRouter();

  // Helper to check if medication is active
  const isMedicationActive = (medicine: MedicineData): boolean => {
    const now = moment();
    if (medicine.start_date) {
      const startDate = moment(medicine.start_date).startOf("day");
      if (now.isBefore(startDate)) return false;
    }
    if (medicine.end_date) {
      const endDate = moment(medicine.end_date).endOf("day");
      if (now.isAfter(endDate)) return false;
    }
    return true;
  };

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

  // Get medications due today
  const medicationsToday = useMemo(() => {
    const now = moment();
    const today = now.startOf("day");
    const sevenDaysFromNow = moment(today).add(7, "days").endOf("day");

    const filtered = medicines
      .filter((med) => {
        // Check if medication is active
        if (!isMedicationActive(med)) {
          console.log(`[DailyWellness] Medication ${med.name} filtered: not active`);
          return false;
        }
        
        // Get next dose
        const nextDose = getNextMedicationDose(med);
        if (!nextDose) {
          console.log(`[DailyWellness] Medication ${med.name} filtered: no next dose (frequency: ${med.frequency}, schedules: ${med.schedules?.length || 0})`);
          return false;
        }
        
        const doseDate = moment(nextDose);
        // Include medications due today or within next 7 days
        // Use isSameOrAfter for today to include medications due today even if time passed
        const isWithinRange = doseDate.isSameOrAfter(today) && doseDate.isSameOrBefore(sevenDaysFromNow);
        
        if (!isWithinRange) {
          console.log(`[DailyWellness] Medication ${med.name} filtered: outside range (due: ${doseDate.format('YYYY-MM-DD HH:mm')})`);
        } else {
          console.log(`[DailyWellness] Medication ${med.name} included (due: ${doseDate.format('YYYY-MM-DD HH:mm')})`);
        }
        
        return isWithinRange;
      })
      .map((med) => {
        const nextDose = getNextMedicationDose(med);
        const doseDate = moment(nextDose!);
        const isToday = doseDate.isSame(today, "day");
        const daysUntil = doseDate.diff(today, "days");
        return { ...med, nextDose: nextDose!, isToday, daysUntil };
      })
      .sort((a, b) => {
        // Today first, then by date
        if (a.isToday && !b.isToday) return -1;
        if (!a.isToday && b.isToday) return 1;
        return moment(a.nextDose).diff(moment(b.nextDose));
      })
      .slice(0, 10); // Show up to 10 (was 3, but let's see all that match first)
    
    console.log(`[DailyWellness] Total medications found: ${filtered.length} out of ${medicines.length}`);
    return filtered;
  }, [medicines]);

  // Vaccination colors
  const getVaccinationColor = (index: number): string => {
    const colors = ["#F59E0B", "#3BD0D2", "#A855F7"]; // Orange, Teal, Purple
    return colors[index % colors.length];
  };

  // Medicine colors - assign a unique color for each medication
  const getMedicineColor = (medicine: MedicineData, index: number, totalCount: number): string => {
    // Generate a wider palette of colors
    const colorPalette = [
      "#10B981", // Green
      "#3B82F6", // Blue
      "#8B5CF6", // Purple
      "#F59E0B", // Amber
      "#EF4444", // Red
      "#06B6D4", // Cyan
      "#F97316", // Orange
      "#84CC16", // Lime
      "#EC4899", // Pink
      "#14B8A6", // Teal
      "#6366F1", // Indigo
      "#F43F5E", // Rose
    ];
    
    // Use modulo to cycle through colors, ensuring each medication gets a distinct color
    // For better distribution, multiply index by a prime number
    const colorIndex = (index * 7) % colorPalette.length;
    return colorPalette[colorIndex];
  };

  // Format time for display
  const formatDueTime = (date: Date): string => {
    const doseMoment = moment(date);
    const now = moment();
    const today = now.startOf("day");
    const tomorrow = moment(today).add(1, "day");
    
    if (doseMoment.isSame(today, "day")) {
      return doseMoment.format("h:mm A");
    }
    const daysDiff = doseMoment.diff(today, "days");
    if (daysDiff === 1) return "Tomorrow";
    if (daysDiff > 1) return `${daysDiff} days`;
    return "Today";
  };

  // Format frequency display
  const getFrequencyDisplay = (medicine: MedicineData): string => {
    switch (medicine.frequency) {
      case "Daily":
        return "Daily";
      case "Weekly":
        return "Weekly";
      case "Monthly":
        return "Monthly";
      default:
        return medicine.frequency || "As needed";
    }
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

      {/* MEDICATIONS TODAY Section */}
      {medicationsToday.length > 0 && (
        <View>
          <Text
            className="text-xs font-semibold tracking-wider mb-3 uppercase"
            style={{ color: theme.secondary }}
          >
            MEDICATIONS TODAY
          </Text>
          <View className="gap-3">
            {medicationsToday.map((med, index) => {
              const color = getMedicineColor(med, index, medicationsToday.length);
              const isDueNow = med.isToday && moment(med.nextDose).isBefore(moment());
              const statusText = isDueNow
                ? "Due Now"
                : med.frequency === "Monthly"
                ? "Monthly"
                : med.frequency === "Daily"
                ? "Daily"
                : getFrequencyDisplay(med);

              return (
                <TouchableOpacity
                  key={med.id}
                  className="flex-row items-center rounded-2xl p-4"
                  style={{
                    backgroundColor: mode === "dark" ? "#1A2026" : theme.card,
                    borderWidth: 1,
                    borderColor: mode === "dark" ? "#325C60" : theme.border,
                  }}
                  onPress={() =>
                    router.push(`/(home)/health-record/${petId}/(tabs)/medications`)
                  }
                  activeOpacity={0.7}
                >
                  {/* Icon */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        mode === "dark"
                          ? color + "20"
                          : color === "#10B981"
                          ? "#065F46"
                          : "#1E3A8A",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="pill"
                      size={24}
                      color={color}
                    />
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.foreground }}
                    >
                      {med.name}
                    </Text>
                    <Text
                      className="text-sm mt-0.5"
                      style={{ color: theme.secondary }}
                    >
                      {getFrequencyDisplay(med)} • Due: {med.isToday 
                        ? (moment(med.nextDose).isSame(moment().startOf("day"), "day") 
                            ? formatDueTime(med.nextDose) 
                            : "Today")
                        : formatDueTime(med.nextDose)}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: isDueNow
                        ? "#F59E0B"
                        : mode === "dark"
                        ? "#2A3441"
                        : theme.border,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: isDueNow ? "#FFFFFF" : theme.secondary,
                      }}
                    >
                      {statusText}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

