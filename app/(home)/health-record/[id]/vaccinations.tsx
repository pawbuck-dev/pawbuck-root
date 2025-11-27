import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, View } from "react-native";

// Dummy data for vaccinations
const DUMMY_VACCINATIONS = [
  {
    id: "1",
    name: "Rabies Vaccine",
    date: "2024-01-15",
    nextDue: "2025-01-15",
    provider: "City Veterinary Clinic",
    batchNumber: "RB-2024-001",
  },
  {
    id: "2",
    name: "DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)",
    date: "2024-02-20",
    nextDue: "2025-02-20",
    provider: "City Veterinary Clinic",
    batchNumber: "DH-2024-045",
  },
  {
    id: "3",
    name: "Bordetella",
    date: "2024-03-10",
    nextDue: "2024-09-10",
    provider: "PetCare Hospital",
    batchNumber: "BR-2024-112",
  },
];

export default function VaccinationsScreen() {
  const { theme } = useTheme();

  // TODO: Filter vaccinations by pet ID when context is implemented
  // const vaccinations = DUMMY_VACCINATIONS.filter(v => v.petId === id);

  if (DUMMY_VACCINATIONS.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
        >
          <Ionicons name="medical" size={40} color={theme.primary} />
        </View>
        <Text
          className="text-xl font-semibold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No vaccines recorded yet
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          Upload your pet's vaccine certificate to get started
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
        {DUMMY_VACCINATIONS.map((vaccine) => (
          <View
            key={vaccine.id}
            className="mb-4 p-4 rounded-2xl"
            style={{ backgroundColor: theme.card }}
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
                  {vaccine.name}
                </Text>
              </View>
            </View>

            {/* Date Information */}
            <View className="ml-13">
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
                  Administered: {new Date(vaccine.date).toLocaleDateString()}
                </Text>
              </View>

              <View className="flex-row items-center mb-2">
                <Ionicons name="time-outline" size={14} color={theme.primary} />
                <Text className="text-sm ml-2" style={{ color: theme.primary }}>
                  Next Due: {new Date(vaccine.nextDue).toLocaleDateString()}
                </Text>
              </View>

              {/* Provider */}
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-sm ml-2"
                  style={{ color: theme.secondary }}
                >
                  {vaccine.provider}
                </Text>
              </View>

              {/* Batch Number */}
              <View className="flex-row items-center">
                <Ionicons
                  name="barcode-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-xs ml-2"
                  style={{ color: theme.secondary }}
                >
                  Batch: {vaccine.batchNumber}
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
