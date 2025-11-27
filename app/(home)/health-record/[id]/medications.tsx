import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

// Dummy data for medications
const DUMMY_MEDICATIONS = [
  {
    id: "1",
    name: "Carprofen 75mg",
    purpose: "Pain relief and anti-inflammatory",
    dosage: "75mg twice daily",
    frequency: "Every 12 hours",
    startDate: "2024-03-15",
    endDate: "2024-03-29",
    prescribedBy: "Dr. Sarah Johnson",
    status: "completed",
  },
  {
    id: "2",
    name: "Heartgard Plus",
    purpose: "Heartworm prevention",
    dosage: "1 chewable tablet",
    frequency: "Once monthly",
    startDate: "2024-01-01",
    endDate: null,
    prescribedBy: "Dr. Sarah Johnson",
    status: "active",
  },
  {
    id: "3",
    name: "Apoquel 16mg",
    purpose: "Allergy relief",
    dosage: "16mg once daily",
    frequency: "Every 24 hours",
    startDate: "2024-02-10",
    endDate: null,
    prescribedBy: "Dr. Michael Chen",
    status: "active",
  },
];

export default function MedicationsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: Filter medications by pet ID when context is implemented
  // const medications = DUMMY_MEDICATIONS.filter(m => m.petId === id);

  if (DUMMY_MEDICATIONS.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
        >
          <Ionicons name="medkit" size={40} color={theme.primary} />
        </View>
        <Text
          className="text-xl font-semibold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No medications recorded yet
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          Add your pet's current medications and prescriptions
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {DUMMY_MEDICATIONS.map((medication) => (
          <View
            key={medication.id}
            className="mb-4 p-4 rounded-2xl"
            style={{ backgroundColor: theme.card }}
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
                    {medication.name}
                  </Text>
                  <View
                    className="mt-1 px-2 py-0.5 rounded-full self-start"
                    style={{
                      backgroundColor:
                        medication.status === "active"
                          ? "rgba(95, 196, 192, 0.2)"
                          : "rgba(156, 163, 175, 0.2)",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color:
                          medication.status === "active"
                            ? theme.primary
                            : theme.secondary,
                      }}
                    >
                      {medication.status === "active" ? "Active" : "Completed"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Medication Details */}
            <View className="ml-13">
              <Text
                className="text-sm mb-2 italic"
                style={{ color: theme.secondary }}
              >
                {medication.purpose}
              </Text>

              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="water-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-sm ml-2"
                  style={{ color: theme.foreground }}
                >
                  {medication.dosage}
                </Text>
              </View>

              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-sm ml-2"
                  style={{ color: theme.secondary }}
                >
                  {medication.frequency}
                </Text>
              </View>

              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-sm ml-2"
                  style={{ color: theme.secondary }}
                >
                  Started: {new Date(medication.startDate).toLocaleDateString()}
                  {medication.endDate &&
                    ` - ${new Date(medication.endDate).toLocaleDateString()}`}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-sm ml-2"
                  style={{ color: theme.secondary }}
                >
                  {medication.prescribedBy}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
