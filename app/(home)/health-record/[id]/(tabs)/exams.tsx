import { ClinicalExamCard } from "@/components/clinical-exams/ClinicalExamCard";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function ExamsScreen() {
  const { theme } = useTheme();
  const { clinicalExams, isLoading } = useClinicalExams();

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (clinicalExams.length === 0) {
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
        {clinicalExams.map((exam) => (
          <ClinicalExamCard key={exam.id} exam={exam} />
        ))}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
