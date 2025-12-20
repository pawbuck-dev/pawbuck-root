import { ClinicalExamCard } from "@/components/clinical-exams/ClinicalExamCard";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const EXAM_CATEGORIES = ["All", "Routine Checkup", "Invoice", "Travel"] as const;
type ExamCategory = (typeof EXAM_CATEGORIES)[number];

export default function ExamsScreen() {
  const { theme } = useTheme();
  const { clinicalExams, isLoading } = useClinicalExams();
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory>("All");

  // Filter exams based on selected category
  const filteredExams = useMemo(() => {
    if (selectedCategory === "All") return clinicalExams;
    return clinicalExams.filter((exam) => exam.exam_type === selectedCategory);
  }, [clinicalExams, selectedCategory]);

  // Count exams per category
  const getCategoryCount = (category: ExamCategory) => {
    if (category === "All") return clinicalExams.length;
    return clinicalExams.filter((exam) => exam.exam_type === category).length;
  };

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
      {/* Filter Tabs */}
      <View className="pt-4 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {EXAM_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = getCategoryCount(category);
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                className="flex-row items-center px-4 py-2 rounded-full"
                style={{
                  backgroundColor: isSelected ? theme.primary : theme.card,
                  borderWidth: isSelected ? 0 : 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color: isSelected ? theme.primaryForeground : theme.foreground,
                  }}
                >
                  {category}
                </Text>
                <View
                  className="ml-2 px-2 py-0.5 rounded-full min-w-[24px] items-center"
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(255, 255, 255, 0.2)"
                      : theme.background,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: isSelected ? theme.primaryForeground : theme.secondary,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Exam List */}
      <ScrollView
        className="flex-1 px-6 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {filteredExams.length === 0 ? (
          <View className="items-center justify-center py-12">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
            >
              <Ionicons name="clipboard-outline" size={28} color={theme.primary} />
            </View>
            <Text
              className="text-base font-medium text-center"
              style={{ color: theme.foreground }}
            >
              No {selectedCategory.toLowerCase()} exams
            </Text>
            <Text
              className="text-sm text-center mt-1"
              style={{ color: theme.secondary }}
            >
              Records will appear here once added
            </Text>
          </View>
        ) : (
          filteredExams.map((exam) => (
            <ClinicalExamCard key={exam.id} exam={exam} />
          ))
        )}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
