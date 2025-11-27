import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

interface VaccinationCardProps {
  vaccination: Tables<"vaccinations">;
}

export const VaccinationCard: React.FC<VaccinationCardProps> = ({
  vaccination,
}) => {
  const { theme } = useTheme();

  const handleLongPress = () => {
    Alert.alert(
      vaccination.name,
      "What would you like to do?",
      [
        {
          text: "Edit",
          //   onPress: () => onEdit?.(vaccination),
        },
        {
          text: "Delete",
          onPress: () => {
            Alert.alert(
              "Delete Vaccination",
              "Are you sure you want to delete this vaccination record?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Delete",
                  style: "destructive",
                  //   onPress: () => onDelete?.(vaccination.id),
                },
              ]
            );
          },
          style: "destructive",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <TouchableOpacity
      className="mb-4 p-4 rounded-2xl"
      style={{ backgroundColor: theme.card }}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Vaccine Name */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
          >
            <Ionicons name="medical" size={20} color={theme.primary} />
          </View>
          <Text
            className="text-base font-semibold flex-1"
            style={{ color: theme.foreground }}
            numberOfLines={2}
          >
            {vaccination.name}
          </Text>
        </View>
      </View>

      {/* Date Information */}
      <View className="ml-13">
        <View className="flex-row items-center mb-2">
          <Ionicons name="calendar-outline" size={14} color={theme.secondary} />
          <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
            Administered: {formatDate(vaccination.date)}
          </Text>
        </View>

        {vaccination.next_due_date && (
          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={14} color={theme.primary} />
            <Text className="text-sm ml-2" style={{ color: theme.primary }}>
              Next Due: {formatDate(vaccination.next_due_date)}
            </Text>
          </View>
        )}

        {/* Vet Clinic */}
        {vaccination.clinic_name && (
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="business-outline"
              size={14}
              color={theme.secondary}
            />
            <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
              {vaccination.clinic_name}
            </Text>
          </View>
        )}

        {/* Notes */}
        {vaccination.notes && (
          <View className="flex-row items-start mt-2">
            <Ionicons
              name="document-text-outline"
              size={14}
              color={theme.secondary}
              style={{ marginTop: 2 }}
            />
            <Text
              className="text-xs ml-2 flex-1"
              style={{ color: theme.secondary }}
              numberOfLines={2}
            >
              {vaccination.notes}
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
  );
};
