import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { useMedicines } from "@/context/medicinesContext";
import { useTheme } from "@/context/themeContext";
import { Medicine } from "@/services/medicines";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { MedicineEditModal } from "./MedicineEditModal";

interface MedicineCardProps {
  medicine: Medicine;
}

// Days of week
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper to format day of month with ordinal suffix
const formatDayOfMonth = (day: number): string => {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
};

// Helper function to check if frequency requires day of week
const requiresDayOfWeek = (frequency: string): boolean => {
  return frequency === "Weekly" || frequency === "Bi-weekly";
};

// Helper function to check if frequency requires day of month
const requiresDayOfMonth = (frequency: string): boolean => {
  return frequency === "Monthly";
};

// Helper function to check if frequency requires scheduled time
const requiresScheduledTime = (frequency: string): boolean => {
  return frequency !== "As Needed";
};

// Helper function to format time for display (24h to 12h)
const formatTimeForDisplay = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to format schedule display
const formatScheduleDisplay = (medicine: Medicine): string => {
  const { frequency, scheduled_day, scheduled_times } = medicine;
  const times = scheduled_times && scheduled_times.length > 0
    ? scheduled_times.map(formatTimeForDisplay).join(", ")
    : "";

  if (frequency === "Weekly" && scheduled_day !== null && scheduled_day !== undefined) {
    return `Every ${daysOfWeek[scheduled_day]}${times ? ` at ${times}` : ""}`;
  }
  
  if (frequency === "Bi-weekly" && scheduled_day !== null && scheduled_day !== undefined) {
    return `Every other ${daysOfWeek[scheduled_day]}${times ? ` at ${times}` : ""}`;
  }
  
  if (frequency === "Monthly" && scheduled_day !== null && scheduled_day !== undefined) {
    return `${formatDayOfMonth(scheduled_day)} of each month${times ? ` at ${times}` : ""}`;
  }

  if (frequency === "As Needed") {
    return ""; // No schedule display for "As Needed"
  }

  // For Daily, Twice Daily, Three Times Daily - just show times
  return times;
};

// Helper function to check if today is the scheduled day for the medication
const isTodayScheduledDay = (medicine: Medicine, now: Date): boolean => {
  const { frequency, scheduled_day } = medicine;
  
  if (scheduled_day === null || scheduled_day === undefined) {
    return true; // No specific day required, so it's always the scheduled day
  }

  if (requiresDayOfWeek(frequency)) {
    // Weekly or Bi-weekly: check day of week (0 = Sunday, 6 = Saturday)
    return now.getDay() === scheduled_day;
  }

  if (requiresDayOfMonth(frequency)) {
    // Monthly: check day of month (1-31)
    return now.getDate() === scheduled_day;
  }

  return true;
};

// Helper function to check if any dose is due today
const checkIfDoseIsDue = (medicine: Medicine, now: Date): boolean => {
  const { scheduled_times } = medicine;
  
  // First check if today is the scheduled day
  if (!isTodayScheduledDay(medicine, now)) {
    return false;
  }

  if (!scheduled_times || scheduled_times.length === 0) {
    return false;
  }

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Check if any scheduled time has passed today
  for (const time of scheduled_times) {
    const [hours, minutes] = time.split(":");
    const scheduledTimeInMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    
    // If the scheduled time has passed and it's within 30 minutes window, it's due
    if (scheduledTimeInMinutes <= currentTimeInMinutes && 
        currentTimeInMinutes - scheduledTimeInMinutes <= 30) {
      return true;
    }
  }
  return false;
};

export const MedicineCard: React.FC<MedicineCardProps> = ({ medicine }) => {
  const { theme } = useTheme();
  const { updateMedicineMutation, deleteMedicineMutation } = useMedicines();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const hasDocument = !!medicine.document_url;

  const handleDelete = () => {
    Alert.alert(
      "Delete Medicine",
      "Are you sure you want to delete this medicine record?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMedicineMutation.mutate(medicine.id, {
              onSuccess: () => {
                Alert.alert("Success", "Medicine deleted successfully");
              },
              onError: (error) => {
                Alert.alert("Error", "Failed to delete medicine");
                console.error("Delete error:", error);
              },
            });
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = (id: string, data: Partial<Medicine>) => {
    updateMedicineMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          setShowEditModal(false);
          Alert.alert("Success", "Medicine updated successfully");
        },
        onError: (error) => {
          Alert.alert("Error", "Failed to update medicine");
          console.error("Update error:", error);
        },
      }
    );
  };

  const handleViewDocument = () => {
    setShowDocumentModal(true);
  };

  const handleLongPress = () => {
    const options: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }> = [];

    if (hasDocument) {
      options.push({
        text: "View Document",
        onPress: handleViewDocument,
      });
    }

    options.push(
      {
        text: "Edit",
        onPress: handleEdit,
      },
      {
        text: "Delete",
        onPress: handleDelete,
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      }
    );

    Alert.alert(
      medicine.name,
      "What would you like to do?",
      options,
      { cancelable: true }
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = () => {
    const now = new Date();

    // "As Needed" medications are always just "Active" if within date range
    if (medicine.frequency === "As Needed") {
      // Check if medication hasn't started yet
      if (medicine.start_date) {
        const startDate = new Date(medicine.start_date);
        startDate.setHours(0, 0, 0, 0);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        if (startDate > todayStart) {
          return {
            label: "Scheduled",
            color: "#3B82F6",
            bgColor: "rgba(59, 130, 246, 0.2)",
          };
        }
      }
      // Check if ended
      if (medicine.end_date) {
        const endDate = new Date(medicine.end_date);
        endDate.setHours(23, 59, 59, 999);
        if (endDate < now) {
          return {
            label: "Completed",
            color: theme.secondary,
            bgColor: "rgba(156, 163, 175, 0.2)",
          };
        }
      }
      return {
        label: "Active",
        color: theme.primary,
        bgColor: "rgba(95, 196, 192, 0.2)",
      };
    }

    // Check if medication hasn't started yet (Scheduled)
    if (medicine.start_date) {
      const startDate = new Date(medicine.start_date);
      startDate.setHours(0, 0, 0, 0);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      if (startDate > todayStart) {
        return {
          label: "Scheduled",
          color: "#3B82F6", // Blue
          bgColor: "rgba(59, 130, 246, 0.2)",
        };
      }
    }

    // Check if medication has ended (Completed)
    if (medicine.end_date) {
      const endDate = new Date(medicine.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (endDate < now) {
        return {
          label: "Completed",
          color: theme.secondary,
          bgColor: "rgba(156, 163, 175, 0.2)",
        };
      }
    }

    // Check if a dose is due today based on scheduled_times and scheduled_day
    if (requiresScheduledTime(medicine.frequency)) {
      const isDue = checkIfDoseIsDue(medicine, now);
      if (isDue) {
        return {
          label: "Due",
          color: "#F59E0B", // Orange/amber
          bgColor: "rgba(245, 158, 11, 0.2)",
        };
      }
    }

    // Default: Active
    return {
      label: "Active",
      color: theme.primary,
      bgColor: "rgba(95, 196, 192, 0.2)",
    };
  };

  const status = getStatusBadge();

  return (
    <>
      <TouchableOpacity
        className="mb-4 p-4 rounded-2xl"
        style={{ backgroundColor: theme.card }}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Medication Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
            >
              <Ionicons name="medkit" size={20} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
                numberOfLines={1}
              >
                {medicine.name}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: status.bgColor,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: status.color,
                    }}
                  >
                    {status.label}
                  </Text>
                </View>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
                >
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    {medicine.type}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {hasDocument && (
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center ml-2"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
              onPress={handleViewDocument}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="document-attach" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Medication Details */}
        <View className="ml-13">
          {medicine.purpose && (
            <Text
              className="text-sm mb-2 italic"
              style={{ color: theme.secondary }}
            >
              {medicine.purpose}
            </Text>
          )}

          <View className="flex-row items-center mb-2">
            <Ionicons name="water-outline" size={14} color={theme.secondary} />
            <Text className="text-sm ml-2" style={{ color: theme.foreground }}>
              {medicine.dosage}
            </Text>
          </View>

          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={14} color={theme.secondary} />
            <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
              {medicine.frequency}
            </Text>
          </View>

          {/* Schedule display - shows day + time for Weekly/Bi-weekly/Monthly, just times for daily frequencies */}
          {requiresScheduledTime(medicine.frequency) && formatScheduleDisplay(medicine) && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="alarm-outline" size={14} color={theme.secondary} />
              <Text className="text-sm ml-2" style={{ color: theme.foreground }}>
                {formatScheduleDisplay(medicine)}
              </Text>
            </View>
          )}

          {medicine.start_date && (
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="calendar-outline"
                size={14}
                color={theme.secondary}
              />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                Started: {formatDate(medicine.start_date)}
                {medicine.end_date && ` - ${formatDate(medicine.end_date)}`}
              </Text>
            </View>
          )}

          {medicine.prescribed_by && (
            <View className="flex-row items-center">
              <Ionicons
                name="person-outline"
                size={14}
                color={theme.secondary}
              />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                {medicine.prescribed_by}
              </Text>
            </View>
          )}
        </View>

        {/* Long press hint */}
        <Text
          className="text-xs text-center mt-3"
          style={{ color: theme.secondary, opacity: 0.6 }}
        >
          Long press to edit or delete
        </Text>
      </TouchableOpacity>

      <MedicineEditModal
        visible={showEditModal}
        medicine={medicine}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        loading={updateMedicineMutation.isPending}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={medicine.document_url || null}
        title="Prescription Document"
      />
    </>
  );
};

