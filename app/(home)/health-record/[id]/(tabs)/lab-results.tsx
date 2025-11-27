import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

// Dummy data for lab results
const DUMMY_LAB_RESULTS = [
  {
    id: "1",
    testName: "Complete Blood Count (CBC)",
    date: "2024-03-18",
    orderedBy: "Dr. Sarah Johnson",
    lab: "VetLab Diagnostics",
    status: "normal",
    results: [
      {
        parameter: "White Blood Cells",
        value: "7.2",
        unit: "K/µL",
        range: "6.0-17.0",
        status: "normal",
      },
      {
        parameter: "Red Blood Cells",
        value: "6.8",
        unit: "M/µL",
        range: "5.5-8.5",
        status: "normal",
      },
      {
        parameter: "Hemoglobin",
        value: "15.2",
        unit: "g/dL",
        range: "12.0-18.0",
        status: "normal",
      },
      {
        parameter: "Platelets",
        value: "285",
        unit: "K/µL",
        range: "175-500",
        status: "normal",
      },
    ],
  },
  {
    id: "2",
    testName: "Chemistry Panel",
    date: "2024-03-18",
    orderedBy: "Dr. Sarah Johnson",
    lab: "VetLab Diagnostics",
    status: "attention",
    results: [
      {
        parameter: "Glucose",
        value: "92",
        unit: "mg/dL",
        range: "70-138",
        status: "normal",
      },
      {
        parameter: "BUN",
        value: "24",
        unit: "mg/dL",
        range: "7-27",
        status: "normal",
      },
      {
        parameter: "Creatinine",
        value: "1.3",
        unit: "mg/dL",
        range: "0.5-1.5",
        status: "normal",
      },
      {
        parameter: "ALT",
        value: "92",
        unit: "U/L",
        range: "10-88",
        status: "high",
      },
      {
        parameter: "Cholesterol",
        value: "245",
        unit: "mg/dL",
        range: "110-320",
        status: "normal",
      },
    ],
  },
  {
    id: "3",
    testName: "Thyroid Panel (T4)",
    date: "2024-01-15",
    orderedBy: "Dr. Michael Chen",
    lab: "PetLab Services",
    status: "normal",
    results: [
      {
        parameter: "Total T4",
        value: "2.4",
        unit: "µg/dL",
        range: "1.5-4.0",
        status: "normal",
      },
      {
        parameter: "Free T4",
        value: "1.8",
        unit: "ng/dL",
        range: "0.8-3.5",
        status: "normal",
      },
    ],
  },
];

export default function LabResultsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: Filter lab results by pet ID when context is implemented
  // const labResults = DUMMY_LAB_RESULTS.filter(l => l.petId === id);

  if (DUMMY_LAB_RESULTS.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
        >
          <Ionicons name="flask" size={40} color={theme.primary} />
        </View>
        <Text
          className="text-xl font-semibold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No lab results yet
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          Lab test results will appear here
        </Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
      case "low":
        return "#EF4444"; // Red
      case "normal":
        return theme.primary;
      default:
        return theme.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "high":
        return "arrow-up";
      case "low":
        return "arrow-down";
      case "normal":
        return "checkmark-circle";
      default:
        return "remove-circle";
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {DUMMY_LAB_RESULTS.map((labResult) => (
          <View
            key={labResult.id}
            className="mb-4 p-4 rounded-2xl"
            style={{ backgroundColor: theme.card }}
          >
            {/* Lab Result Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
                >
                  <Ionicons name="flask" size={20} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.foreground }}
                    numberOfLines={2}
                  >
                    {labResult.testName}
                  </Text>
                  <Text
                    className="text-sm mt-0.5"
                    style={{ color: theme.secondary }}
                  >
                    {new Date(labResult.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View
                className="px-2 py-1 rounded-full"
                style={{
                  backgroundColor:
                    labResult.status === "normal"
                      ? "rgba(95, 196, 192, 0.2)"
                      : "rgba(239, 68, 68, 0.2)",
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color:
                      labResult.status === "normal" ? theme.primary : "#EF4444",
                  }}
                >
                  {labResult.status === "normal" ? "Normal" : "Needs Attention"}
                </Text>
              </View>
            </View>

            {/* Lab Details */}
            <View className="ml-13">
              <View className="flex-row items-center mb-3">
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  className="text-sm ml-2"
                  style={{ color: theme.secondary }}
                >
                  {labResult.orderedBy} • {labResult.lab}
                </Text>
              </View>

              {/* Results */}
              <View
                className="p-3 rounded-lg"
                style={{ backgroundColor: theme.background }}
              >
                {labResult.results.map((result, index) => (
                  <View
                    key={index}
                    className={`flex-row items-center justify-between ${
                      index < labResult.results.length - 1 ? "mb-3" : ""
                    }`}
                  >
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: theme.foreground }}
                      >
                        {result.parameter}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: theme.secondary }}
                      >
                        Range: {result.range} {result.unit}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text
                        className="text-sm font-semibold mr-2"
                        style={{ color: getStatusColor(result.status) }}
                      >
                        {result.value} {result.unit}
                      </Text>
                      <Ionicons
                        name={getStatusIcon(result.status)}
                        size={16}
                        color={getStatusColor(result.status)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
