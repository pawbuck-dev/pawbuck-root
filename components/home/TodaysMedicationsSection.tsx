import { useTheme } from "@/context/themeContext";
import { MedicineData } from "@/models/medication";
import { getNextMedicationDose } from "@/utils/medication";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { markMedicationDoseComplete, getTodaysMedicationDoses } from "@/services/medicationDoses";

type TodaysMedicationsSectionProps = {
  petId: string;
  medicines: MedicineData[];
};

type MedicationDoseStatus = {
  medication: MedicineData;
  scheduledTime: Date;
  isCompleted: boolean;
  doseId?: string; // ID of completed dose if it exists
};

export default function TodaysMedicationsSection({
  petId,
  medicines,
}: TodaysMedicationsSectionProps) {
  const { theme, mode } = useTheme();
  const queryClient = useQueryClient();

  // Fetch today's medication doses
  const { data: todaysDoses = [], isLoading } = useQuery({
    queryKey: ["medication-doses", petId, moment().format("YYYY-MM-DD")],
    queryFn: () => getTodaysMedicationDoses(petId),
    enabled: !!petId,
  });

  // Get today's medications with their scheduled doses and completion status
  const todaysMedications = useMemo(() => {
    const today = moment().startOf("day");
    const tomorrow = moment(today).add(1, "day");
    const now = moment();

    const medications: MedicationDoseStatus[] = [];

    medicines.forEach((med) => {
      // Get all scheduled doses for today
      const dosesForToday = getDosesForToday(med, today, tomorrow, now);
      
      dosesForToday.forEach((doseTime) => {
        // Check if this dose is already completed
        const completedDose = todaysDoses.find(
          (dose) =>
            dose.medication_id === med.id &&
            moment(dose.scheduled_time).isSame(moment(doseTime), "minute")
        );

        medications.push({
          medication: med,
          scheduledTime: doseTime,
          isCompleted: !!completedDose,
          doseId: completedDose?.id,
        });
      });
    });

    // Sort by scheduled time
    return medications.sort((a, b) =>
      moment(a.scheduledTime).diff(moment(b.scheduledTime))
    );
  }, [medicines, todaysDoses]);

  // Calculate completion stats
  const completionStats = useMemo(() => {
    const total = todaysMedications.length;
    const completed = todaysMedications.filter((m) => m.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [todaysMedications]);

  // Mark medication as complete
  const markCompleteMutation = useMutation({
    mutationFn: async ({ medicationId, scheduledTime }: { medicationId: string; scheduledTime: Date }) => {
      return markMedicationDoseComplete(petId, medicationId, scheduledTime);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["medication-doses", petId, moment().format("YYYY-MM-DD")],
      });
      queryClient.invalidateQueries({ queryKey: ["medicines", petId] });
    },
  });

  const handleMarkComplete = (medicationId: string, scheduledTime: Date) => {
    markCompleteMutation.mutate({ medicationId, scheduledTime });
  };

  // Helper to get all doses scheduled for today
  const getDosesForToday = (
    med: MedicineData,
    today: moment.Moment,
    tomorrow: moment.Moment,
    now: moment.Moment
  ): Date[] => {
    const doses: Date[] = [];
    const nextDose = getNextMedicationDose(med);
    
    if (!nextDose) return doses;

    // For daily medications, check all scheduled times today
    if (med.frequency === "Daily" && med.schedules && med.schedules.length > 0) {
      med.schedules.forEach((schedule) => {
        const doseTime = moment(today).set({
          hour: parseInt(schedule.time.split(":")[0]),
          minute: parseInt(schedule.time.split(":")[1]),
          second: 0,
          millisecond: 0,
        });
        
        // Include doses that haven't passed yet, or include all if time has passed (user might be catching up)
        if (doseTime.isAfter(today) && doseTime.isBefore(tomorrow)) {
          doses.push(doseTime.toDate());
        }
      });
    } else {
      // For other frequencies, use the next dose if it's today
      const nextDoseMoment = moment(nextDose);
      if (nextDoseMoment.isSame(today, "day")) {
        doses.push(nextDose);
      }
    }

    return doses;
  };

  if (isLoading) {
    return (
      <View className="px-4 mb-6">
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (todaysMedications.length === 0) {
    return null; // Don't show section if no medications for today
  }

  return (
    <View className="px-4 mb-6">
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{
              backgroundColor: mode === "dark" ? "#1E3A8A" : "#DBEAFE",
            }}
          >
            <MaterialCommunityIcons
              name="pill"
              size={20}
              color={mode === "dark" ? "#3B82F6" : "#2563EB"}
            />
          </View>
          <View className="flex-1">
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Today's Medications
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.secondary }}
            >
              {completionStats.completed}/{completionStats.total} completed
            </Text>
          </View>
        </View>
        <Text
          className="text-lg font-bold ml-3"
          style={{ color: "#22C55E" }}
        >
          {completionStats.percentage}%
        </Text>
      </View>

      {/* Medication Cards */}
      <View className="gap-3">
        {todaysMedications.map((medDose, index) => {
          const isCompleted = medDose.isCompleted;
          const scheduledTime = moment(medDose.scheduledTime);
          const isPastTime = scheduledTime.isBefore(moment());

          return (
            <View
              key={`${medDose.medication.id}-${scheduledTime.format("HHmm")}-${index}`}
              className="flex-row items-center rounded-2xl p-4"
              style={{
                backgroundColor: isCompleted
                  ? mode === "dark"
                    ? "#065F46"
                    : "#D1FAE5"
                  : mode === "dark"
                  ? "#1A2026"
                  : theme.card,
                borderWidth: 1,
                borderColor: isCompleted
                  ? mode === "dark"
                    ? "#10B981"
                    : "#10B981"
                  : mode === "dark"
                  ? "#325C60"
                  : theme.border,
              }}
            >
              {/* Icon */}
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                style={{
                  backgroundColor: isCompleted
                    ? mode === "dark"
                      ? "#10B981"
                      : "#10B981"
                    : mode === "dark"
                    ? "#1E3A8A"
                    : "#DBEAFE",
                }}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons
                    name="pill"
                    size={24}
                    color={mode === "dark" ? "#3B82F6" : "#2563EB"}
                  />
                )}
              </View>

              {/* Content */}
              <View className="flex-1">
                <Text
                  className="text-base font-bold"
                  style={{
                    color: isCompleted
                      ? mode === "dark"
                        ? "#10B981"
                        : "#059669"
                      : theme.foreground,
                  }}
                >
                  {medDose.medication.name}
                </Text>
                <Text
                  className="text-sm mt-0.5"
                  style={{ color: theme.secondary }}
                >
                  {isCompleted
                    ? "Completed"
                    : `Scheduled: ${scheduledTime.format("h:mm A")}`}
                </Text>
              </View>

              {/* Action Button/Time */}
              {isCompleted ? (
                <TouchableOpacity
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: mode === "dark" ? "#10B981" : "#10B981",
                  }}
                  disabled
                >
                  <Text className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
                    Done
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="items-end">
                  <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: theme.foreground }}
                  >
                    {scheduledTime.format("h:mm A")}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      handleMarkComplete(
                        medDose.medication.id,
                        medDose.scheduledTime
                      )
                    }
                    disabled={markCompleteMutation.isPending}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor:
                        mode === "dark" ? "#1E3A8A" : "#DBEAFE",
                      opacity: markCompleteMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {markCompleteMutation.isPending ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Text
                        className="text-sm font-semibold"
                        style={{
                          color: mode === "dark" ? "#3B82F6" : "#2563EB",
                        }}
                      >
                        Mark Done
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

