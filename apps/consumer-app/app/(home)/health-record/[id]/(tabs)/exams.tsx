import { ClinicalExamCard } from "@/components/clinical-exams/ClinicalExamCard";
import { ExamSectionHeader, ExamCategory } from "@/components/clinical-exams/ExamSectionHeader";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  UIManager,
  View,
} from "react-native";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EXAM_CATEGORIES: ExamCategory[] = ["Routine Checkup", "Invoice", "Travel"];

// Helper function to check if exam belongs to category
const examMatchesCategory = (examType: string | null, category: ExamCategory): boolean => {
  if (!examType) return false;
  if (category === "Travel") {
    return examType.toLowerCase().includes("travel");
  }
  return examType === category;
};

export default function ExamsScreen() {
  const { theme } = useTheme();
  const { pet } = useSelectedPet();
  const { clinicalExams, isLoading } = useClinicalExams();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Track expanded state for each section
  const [expandedSections, setExpandedSections] = useState<Record<ExamCategory, boolean>>({
    "Routine Checkup": false,
    Invoice: false,
    Travel: false,
  });

  const toggleSection = (category: ExamCategory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Group exams by category
  const groupedExams = useMemo(() => {
    const grouped: Record<ExamCategory, Tables<"clinical_exams">[]> = {
      "Routine Checkup": [],
      Invoice: [],
      Travel: [],
    };

    clinicalExams.forEach((exam) => {
      for (const category of EXAM_CATEGORIES) {
        if (examMatchesCategory(exam.exam_type, category)) {
          grouped[category].push(exam);
          break;
        }
      }
    });

    return grouped;
  }, [clinicalExams]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["clinicalExams", pet.id] });
    setRefreshing(false);
  }, [queryClient, pet.id]);

  useFocusEffect(
    React.useCallback(() => {
      // Refetch clinical exams when screen comes into focus
      queryClient.invalidateQueries({ queryKey: ["clinicalExams", pet.id] });
    }, [queryClient, pet.id])
  );

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

  const sections = EXAM_CATEGORIES.filter((category) => groupedExams[category].length > 0);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {sections.length === 0 ? (
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
              No exams recorded yet
            </Text>
            <Text
              className="text-sm text-center mt-1"
              style={{ color: theme.secondary }}
            >
              Records will appear here once added
            </Text>
          </View>
        ) : (
          sections.map((category) => (
            <View key={category} className="mb-4">
              {/* Section Header */}
              <ExamSectionHeader
                category={category}
                count={groupedExams[category].length}
                isExpanded={expandedSections[category]}
                onToggle={() => toggleSection(category)}
              />

              {/* Section Items */}
              {expandedSections[category] && (
                <View className="px-4">
                  {groupedExams[category].map((exam) => (
                    <ClinicalExamCard key={exam.id} exam={exam} />
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
