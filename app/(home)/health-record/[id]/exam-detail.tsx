import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import {
  OverflowAction,
  RecordOverflowSheet,
} from "@/components/health/RecordOverflowSheet";
import { ClinicalExamEditModal } from "@/components/clinical-exams/ClinicalExamEditModal";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useTheme } from "@/context/themeContext";
import { Tables, TablesUpdate } from "@/database.types";
import { FIGMA_HEALTH_EXAMS_ICON_BG } from "@/constants/figmaHealthLayout";
import { shareStorageDocument, shareTextSummary } from "@/utils/documentShare";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExamDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    clinicalExams,
    updateClinicalExamMutation,
    deleteClinicalExamMutation,
  } = useClinicalExams();

  const params = useLocalSearchParams<{ id: string; examId?: string }>();
  const rawEid = params.examId;
  const examId = Array.isArray(rawEid) ? rawEid[0] : rawEid;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  const exam = useMemo(
    () => clinicalExams.find((e) => e.id === examId),
    [clinicalExams, examId]
  );

  const hasDocument = !!exam?.document_url;

  const hasValue = (value: number | null | undefined): boolean => {
    return value !== null && value !== undefined && value !== 0;
  };

  const handleShare = () => {
    if (!exam) return;
    const title = exam.exam_type || "Clinical exam";
    const body = [
      `Date: ${new Date(exam.exam_date).toLocaleDateString()}`,
      exam.vet_name ? `Vet: ${exam.vet_name}` : null,
      exam.clinic_name ? `Clinic: ${exam.clinic_name}` : null,
      hasValue(exam.weight_value)
        ? `Weight: ${exam.weight_value} ${exam.weight_unit || "lbs"}`
        : null,
      hasValue(exam.temperature) ? `Temp: ${exam.temperature}°F` : null,
      hasValue(exam.heart_rate) ? `Heart rate: ${exam.heart_rate} bpm` : null,
      hasValue(exam.respiratory_rate)
        ? `Resp. rate: ${exam.respiratory_rate} br/min`
        : null,
      exam.findings ? `Findings: ${exam.findings}` : null,
      exam.notes ? `Notes: ${exam.notes}` : null,
      exam.follow_up_date
        ? `Follow-up: ${new Date(exam.follow_up_date).toLocaleDateString()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (exam.document_url) {
      void shareStorageDocument(
        exam.document_url,
        `${(exam.exam_type || "exam").replace(/\s+/g, "_")}_document`
      );
    } else {
      void shareTextSummary(title, body);
    }
  };

  const handleDownload = () => {
    if (!exam?.document_url) {
      Alert.alert("Download", "No document is attached to this record.");
      return;
    }
    void shareStorageDocument(
      exam.document_url,
      `${(exam.exam_type || "exam").replace(/\s+/g, "_")}_document`
    );
  };

  const handleDelete = () => {
    if (!exam) return;
    Alert.alert(
      "Delete Exam",
      "Are you sure you want to delete this exam record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteClinicalExamMutation.mutate(exam.id, {
              onSuccess: () => router.back(),
              onError: () => Alert.alert("Error", "Failed to delete exam record"),
            });
          },
        },
      ]
    );
  };

  const handleSaveEdit = (id: string, data: TablesUpdate<"clinical_exams">) => {
    updateClinicalExamMutation.mutate(
      { id, data },
      {
        onSuccess: () => setShowEdit(false),
        onError: () => Alert.alert("Error", "Failed to update exam record"),
      }
    );
  };

  const menuActions: OverflowAction[] = [
    { label: "Edit", onPress: () => setShowEdit(true) },
    { label: "Share", onPress: handleShare },
    { label: "Download", onPress: handleDownload },
    { label: "Delete", onPress: handleDelete, destructive: true },
  ];

  if (!examId) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background, paddingTop: insets.top }}
      >
        <Text style={{ color: theme.secondary }}>Missing exam id.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!exam) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background, paddingTop: insets.top }}
      >
        <ActivityIndicator color={theme.primary} />
        <Text className="mt-3" style={{ color: theme.secondary }}>
          Loading…
        </Text>
      </View>
    );
  }

  const isTravelDocument = exam.exam_type?.toLowerCase().includes("travel");
  let validityLine: string | null = null;
  if (isTravelDocument && exam.validity_date) {
    const validityDate = new Date(exam.validity_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validityDate.setHours(0, 0, 0, 0);
    const isValid = validityDate >= today;
    validityLine = isValid
      ? `Valid until ${validityDate.toLocaleDateString()}`
      : "Travel document expired";
  }

  const showVitals =
    exam.exam_type?.toLowerCase().includes("checkup") &&
    (hasValue(exam.weight_value) ||
      hasValue(exam.temperature) ||
      hasValue(exam.heart_rate) ||
      hasValue(exam.respiratory_rate));

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.foreground} />
        </TouchableOpacity>
        <Text
          className="text-base font-semibold flex-1 text-center mx-2"
          style={{ color: theme.foreground }}
          numberOfLines={1}
        >
          Exam
        </Text>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="p-5 rounded-2xl mb-4"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-start">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: FIGMA_HEALTH_EXAMS_ICON_BG }}
            >
              <MaterialCommunityIcons name="stethoscope" size={26} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text
                className="text-xl font-bold"
                style={{ color: theme.foreground }}
              >
                {exam.exam_type || "Clinical exam"}
              </Text>
              <Text className="text-sm mt-1" style={{ color: theme.secondary }}>
                {new Date(exam.exam_date).toLocaleDateString()}
              </Text>
              {validityLine && (
                <View
                  className="self-start mt-2 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: validityLine.includes("expired")
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(34, 197, 94, 0.15)",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: validityLine.includes("expired")
                        ? "#ef4444"
                        : "#22c55e",
                    }}
                  >
                    {validityLine}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {(exam.vet_name || exam.clinic_name) && (
            <View className="flex-row items-center mt-5">
              <Ionicons name="person-outline" size={16} color={theme.secondary} />
              <Text className="text-sm ml-2 flex-1" style={{ color: theme.secondary }}>
                {[exam.vet_name, exam.clinic_name].filter(Boolean).join(" • ")}
              </Text>
            </View>
          )}

          {showVitals && (
            <View className="flex-row flex-wrap gap-3 mt-4">
              {hasValue(exam.weight_value) && (
                <VitalPill
                  label="Weight"
                  value={`${exam.weight_value} ${exam.weight_unit || "lbs"}`}
                  theme={theme}
                />
              )}
              {hasValue(exam.temperature) && (
                <VitalPill
                  label="Temp"
                  value={`${exam.temperature}°F`}
                  theme={theme}
                />
              )}
              {hasValue(exam.heart_rate) && (
                <VitalPill
                  label="Heart rate"
                  value={`${exam.heart_rate} bpm`}
                  theme={theme}
                />
              )}
              {hasValue(exam.respiratory_rate) && (
                <VitalPill
                  label="Resp. rate"
                  value={`${exam.respiratory_rate} br/min`}
                  theme={theme}
                />
              )}
            </View>
          )}

          {exam.findings && (
            <Section title="Findings" theme={theme}>
              <Text style={{ color: theme.foreground }}>{exam.findings}</Text>
            </Section>
          )}
          {exam.notes && (
            <Section title="Recommendations" theme={theme}>
              <Text style={{ color: theme.foreground }}>{exam.notes}</Text>
            </Section>
          )}
          {exam.follow_up_date && (
            <View className="flex-row items-center mt-4">
              <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              <Text className="text-sm ml-2" style={{ color: theme.primary }}>
                Follow-up: {new Date(exam.follow_up_date).toLocaleDateString()}
              </Text>
            </View>
          )}

          {hasDocument && (
            <TouchableOpacity
              onPress={() => setShowDoc(true)}
              className="mt-5 py-3 rounded-xl items-center flex-row justify-center gap-2"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
            >
              <Ionicons name="document-attach" size={20} color={theme.primary} />
              <Text className="font-semibold" style={{ color: theme.primary }}>
                View document
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <RecordOverflowSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={menuActions}
      />

      <ClinicalExamEditModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveEdit}
        exam={exam}
        loading={updateClinicalExamMutation.isPending}
      />

      <DocumentViewerModal
        visible={showDoc}
        onClose={() => setShowDoc(false)}
        documentPath={exam.document_url}
        title="Exam Document"
      />
    </View>
  );
}

function VitalPill({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: { background: string; foreground: string; secondary: string };
}) {
  return (
    <View className="px-3 py-2 rounded-lg" style={{ backgroundColor: theme.background }}>
      <Text className="text-xs" style={{ color: theme.secondary }}>
        {label}
      </Text>
      <Text className="text-sm font-semibold mt-0.5" style={{ color: theme.foreground }}>
        {value}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: { primary: string; foreground: string };
}) {
  return (
    <View className="mt-5">
      <Text className="text-xs font-semibold mb-1" style={{ color: theme.primary }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}
