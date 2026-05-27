import { ClinicalExamCard } from "@/components/clinical-exams/ClinicalExamCard";
import { ExamSectionHeader } from "@/components/clinical-exams/ExamSectionHeader";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import {
  FIGMA_HEALTH_EXAMS_ICON_BG,
  healthRecordTabCanvas,
} from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import {
  EXAM_CATEGORIES,
  ExamCategory,
  groupClinicalExamsByCategory,
} from "@/utils/clinicalExamCategories";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

function sectionsExpandedForExams(
  exams: Tables<"clinical_exams">[],
): Record<ExamCategory, boolean> {
  const grouped = groupClinicalExamsByCategory(exams);
  return EXAM_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = grouped[cat].length > 0;
      return acc;
    },
    {} as Record<ExamCategory, boolean>,
  );
}

export default function ExamsScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const listCanvas = healthRecordTabCanvas(theme, isDark);
  const { pet } = useSelectedPet();
  const { clinicalExams, isLoading } = useClinicalExams();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Track expanded state for each section (start collapsed; reset on screen focus)
  const [expandedSections, setExpandedSections] = useState<Record<ExamCategory, boolean>>(() =>
    sectionsExpandedForExams([]),
  );

  const toggleSection = (category: ExamCategory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const groupedExams = useMemo(
    () => groupClinicalExamsByCategory(clinicalExams),
    [clinicalExams],
  );

  React.useEffect(() => {
    if (clinicalExams.length === 0) return;
    setExpandedSections(sectionsExpandedForExams(clinicalExams));
  }, [clinicalExams]);

  const onRefresh = useCallback(async () => {
    if (!pet) return;
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["clinicalExams", pet.id] });
    setRefreshing(false);
  }, [queryClient, pet]);

  useFocusEffect(
    React.useCallback(() => {
      if (!pet) return;
      queryClient.invalidateQueries({ queryKey: ["clinicalExams", pet.id] });
    }, [queryClient, pet]),
  );

  if (!pet) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: listCanvas }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: listCanvas }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (clinicalExams.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: listCanvas, paddingBottom: 120 }}
      >
        <View
          className="w-28 h-28 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: FIGMA_HEALTH_EXAMS_ICON_BG }}
        >
          <MaterialCommunityIcons name="stethoscope" size={40} color="#FFFFFF" />
        </View>
        <Text
          className="text-xl font-bold mb-2 text-center"
          style={{ color: theme.foreground }}
        >
          No Exams Record Yet
        </Text>
        <Text
          className="text-sm text-center leading-5"
          style={{ color: theme.secondary }}
        >
          Keep track of your pet&apos;s veterinary examinations. Tap + to upload exam documents.
        </Text>
      </View>
    );
  }

  const sections = EXAM_CATEGORIES.filter((category) => groupedExams[category].length > 0);

  return (
    <View className="flex-1" style={{ backgroundColor: listCanvas }}>
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
        {sections.length > 0 && (
          <Text className="text-base font-bold mb-3 px-1" style={{ color: theme.foreground }}>
            Recent Activity
          </Text>
        )}
        {sections.length === 0 ? (
          <View className="items-center justify-center py-12">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: FIGMA_HEALTH_EXAMS_ICON_BG }}
            >
              <MaterialCommunityIcons name="stethoscope" size={28} color="#FFFFFF" />
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

        <View className="h-28" />
      </ScrollView>
    </View>
  );
}
