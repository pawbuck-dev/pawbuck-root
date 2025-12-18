import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useTheme } from "@/context/themeContext";
import { Tables, TablesUpdate } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { ClinicalExamEditModal } from "./ClinicalExamEditModal";

interface ClinicalExamCardProps {
  exam: Tables<"clinical_exams">;
}

export const ClinicalExamCard: React.FC<ClinicalExamCardProps> = ({ exam }) => {
  const { theme } = useTheme();
  const { updateClinicalExamMutation, deleteClinicalExamMutation } = useClinicalExams();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const hasDocument = !!exam.document_url;

  const hasValue = (value: number | null | undefined): boolean => {
    return value !== null && value !== undefined && value !== 0;
  };

  const formatWeight = (value: number | null, unit: string | null) => {
    if (!hasValue(value)) return null;
    return `${value} ${unit || "lbs"}`;
  };

  const formatTemperature = (temp: number | null) => {
    if (!hasValue(temp)) return null;
    return `${temp}°F`;
  };

  const formatHeartRate = (rate: number | null) => {
    if (!hasValue(rate)) return null;
    return `${rate} bpm`;
  };

  const formatRespiratoryRate = (rate: number | null) => {
    if (!hasValue(rate)) return null;
    return `${rate} br/min`;
  };

  const handleDelete = () => {
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
              onSuccess: () => {
                Alert.alert("Success", "Exam record deleted successfully");
              },
              onError: (error) => {
                Alert.alert("Error", "Failed to delete exam record");
                console.error("Delete error:", error);
              },
            });
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = (id: string, data: TablesUpdate<"clinical_exams">) => {
    updateClinicalExamMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          setShowEditModal(false);
          Alert.alert("Success", "Exam record updated successfully");
        },
        onError: (error) => {
          Alert.alert("Error", "Failed to update exam record");
          console.error("Update error:", error);
        },
      }
    );
  };

  const handleViewDocument = () => {
    setShowDocumentModal(true);
  };

  const handleLongPress = () => {
    const options: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }> = [];

    if (hasDocument) {
      options.push({
        text: "View Document",
        onPress: handleViewDocument,
      });
    }

    options.push(
      { text: "Edit", onPress: handleEdit },
      { text: "Delete", onPress: handleDelete, style: "destructive" },
      { text: "Cancel", style: "cancel" }
    );

    Alert.alert(
      exam.exam_type || "Clinical Exam",
      "What would you like to do?",
      options,
      { cancelable: true }
    );
  };

  return (
    <>
      <TouchableOpacity
        className="mb-4 p-4 rounded-2xl"
        style={{ backgroundColor: theme.card }}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
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
              {exam.exam_type || "Clinical Exam"}
            </Text>
            <Text
              className="text-sm mt-0.5"
              style={{ color: theme.secondary }}
            >
              {new Date(exam.exam_date).toLocaleDateString()}
            </Text>
          </View>
          {hasDocument && (
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center ml-2"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
              onPress={handleViewDocument}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="document-attach" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Exam Details */}
        <View className="ml-13">
          {/* Veterinarian & Clinic */}
          {(exam.vet_name || exam.clinic_name) && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="person-outline" size={14} color={theme.secondary} />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                {[exam.vet_name, exam.clinic_name].filter(Boolean).join(" • ")}
              </Text>
            </View>
          )}

          {/* Vitals */}
          {(hasValue(exam.weight_value) || hasValue(exam.temperature) || hasValue(exam.heart_rate) || hasValue(exam.respiratory_rate)) && (
            <View className="flex-row flex-wrap mb-3 gap-3">
              {hasValue(exam.weight_value) && (
                <View className="px-3 py-2 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>Weight</Text>
                  <Text className="text-sm font-semibold" style={{ color: theme.foreground }}>
                    {formatWeight(exam.weight_value, exam.weight_unit)}
                  </Text>
                </View>
              )}
              {hasValue(exam.temperature) && (
                <View className="px-3 py-2 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>Temp</Text>
                  <Text className="text-sm font-semibold" style={{ color: theme.foreground }}>
                    {formatTemperature(exam.temperature)}
                  </Text>
                </View>
              )}
              {hasValue(exam.heart_rate) && (
                <View className="px-3 py-2 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>Heart Rate</Text>
                  <Text className="text-sm font-semibold" style={{ color: theme.foreground }}>
                    {formatHeartRate(exam.heart_rate)}
                  </Text>
                </View>
              )}
              {hasValue(exam.respiratory_rate) && (
                <View className="px-3 py-2 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>Resp. Rate</Text>
                  <Text className="text-sm font-semibold" style={{ color: theme.foreground }}>
                    {formatRespiratoryRate(exam.respiratory_rate)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Findings */}
          {exam.findings && (
            <View className="mb-2">
              <Text className="text-xs font-semibold mb-1" style={{ color: theme.primary }}>
                FINDINGS
              </Text>
              <Text className="text-sm" style={{ color: theme.foreground }}>
                {exam.findings}
              </Text>
            </View>
          )}

          {/* Recommendations/Notes */}
          {exam.notes && (
            <View className="mb-2">
              <Text className="text-xs font-semibold mb-1" style={{ color: theme.primary }}>
                RECOMMENDATIONS
              </Text>
              <Text className="text-sm" style={{ color: theme.foreground }}>
                {exam.notes}
              </Text>
            </View>
          )}

          {/* Follow-up Date */}
          {exam.follow_up_date && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="calendar-outline" size={14} color={theme.primary} />
              <Text className="text-sm ml-2" style={{ color: theme.primary }}>
                Follow-up: {new Date(exam.follow_up_date).toLocaleDateString()}
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

      {/* Edit Modal */}
      <ClinicalExamEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        exam={exam}
        loading={updateClinicalExamMutation.isPending}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={exam.document_url}
        title="Exam Document"
      />
    </>
  );
};
