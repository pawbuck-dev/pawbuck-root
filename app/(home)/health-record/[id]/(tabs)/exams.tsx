import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

// Dummy data for exams
const DUMMY_EXAMS = [
  {
    id: "1",
    type: "Annual Wellness Exam",
    date: "2024-03-20",
    veterinarian: "Dr. Sarah Johnson",
    clinic: "City Veterinary Clinic",
    weight: "28.5 lbs",
    temperature: "101.2°F",
    heartRate: "92 bpm",
    findings: "Healthy, good body condition. Minor tartar buildup on teeth.",
    recommendations:
      "Consider dental cleaning in 6 months. Continue current diet.",
  },
  {
    id: "2",
    type: "Follow-up Examination",
    date: "2024-01-10",
    veterinarian: "Dr. Michael Chen",
    clinic: "PetCare Hospital",
    weight: "27.8 lbs",
    temperature: "100.8°F",
    heartRate: "88 bpm",
    findings: "Skin allergy improved with treatment. No signs of infection.",
    recommendations: "Continue antihistamine treatment for 2 more weeks.",
  },
  {
    id: "3",
    type: "Dental Examination",
    date: "2023-09-15",
    veterinarian: "Dr. Sarah Johnson",
    clinic: "City Veterinary Clinic",
    weight: "27.2 lbs",
    temperature: "100.5°F",
    heartRate: "90 bpm",
    findings: "Moderate tartar buildup. One loose tooth (premolar).",
    recommendations:
      "Dental cleaning performed. Tooth extracted. Soft food for 5 days.",
  },
];

export default function ExamsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: Filter exams by pet ID when context is implemented
  // const exams = DUMMY_EXAMS.filter(e => e.petId === id);

  if (DUMMY_EXAMS.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
        >
          <Ionicons name="clipboard" size={40} color={theme.primary} />
        </View>
        <Text
          className="text-xl font-semibold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No exams recorded yet
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          Keep track of your pet's veterinary examinations
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
        {DUMMY_EXAMS.map((exam) => (
          <View
            key={exam.id}
            className="mb-4 p-4 rounded-2xl"
            style={{ backgroundColor: theme.card }}
          >
            {/* Exam Header */}
            <View className="flex-row items-center mb-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
              >
                <Ionicons name="clipboard" size={20} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                >
                  {exam.type}
                </Text>
                <Text
                  className="text-sm mt-0.5"
                  style={{ color: theme.secondary }}
                >
                  {new Date(exam.date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Exam Details */}
            <View className="ml-13">
              {/* Veterinarian & Clinic */}
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-sm ml-2"
                  style={{ color: theme.secondary }}
                >
                  {exam.veterinarian} • {exam.clinic}
                </Text>
              </View>

              {/* Vitals */}
              <View className="flex-row flex-wrap mb-3 gap-3">
                <View
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: theme.background }}
                >
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Weight
                  </Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    {exam.weight}
                  </Text>
                </View>
                <View
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: theme.background }}
                >
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Temp
                  </Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    {exam.temperature}
                  </Text>
                </View>
                <View
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: theme.background }}
                >
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Heart Rate
                  </Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    {exam.heartRate}
                  </Text>
                </View>
              </View>

              {/* Findings */}
              <View className="mb-2">
                <Text
                  className="text-xs font-semibold mb-1"
                  style={{ color: theme.primary }}
                >
                  FINDINGS
                </Text>
                <Text className="text-sm" style={{ color: theme.foreground }}>
                  {exam.findings}
                </Text>
              </View>

              {/* Recommendations */}
              <View>
                <Text
                  className="text-xs font-semibold mb-1"
                  style={{ color: theme.primary }}
                >
                  RECOMMENDATIONS
                </Text>
                <Text className="text-sm" style={{ color: theme.foreground }}>
                  {exam.recommendations}
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
