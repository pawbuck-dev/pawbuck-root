import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { DomainCategoryIconWell } from "@/components/ui/IconWell";
import {
  HEALTH_LAYOUT,
  healthListCardChrome,
} from "@/constants/figmaHealthLayout";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { Tables, TablesUpdate } from "@/database.types";
import { formatDate, formatDateMedium } from "@/utils/dates";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { ClinicalExamEditModal } from "./ClinicalExamEditModal";

interface ClinicalExamCardProps {
  exam: Tables<"clinical_exams">;
}

export const ClinicalExamCard: React.FC<ClinicalExamCardProps> = ({ exam }) => {
  const { pet } = useSelectedPet();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const chrome = healthListCardChrome(theme, isDark);
  const { updateClinicalExamMutation, deleteClinicalExamMutation } = useClinicalExams();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const hasDocument = !!exam.document_url;
  const hasDetails = exam.findings || exam.notes || exam.follow_up_date;

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

  // Check if this is a travel document
  const isTravelDocument = exam.exam_type?.toLowerCase().includes("travel");

  // Get validity status for travel documents
  const getValidityStatus = (): { isValid: boolean; text: string } | null => {
    if (!isTravelDocument || !exam.validity_date) return null;
    
    const validityDate = new Date(exam.validity_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validityDate.setHours(0, 0, 0, 0);
    
    const isValid = validityDate >= today;
    const formattedDate = formatDateMedium(validityDate, pet?.country);
    
    return {
      isValid,
      text: isValid ? `Valid until ${formattedDate}` : "Expired",
    };
  };

  const validityStatus = getValidityStatus();

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
        className="mb-4 p-4"
        style={{
          borderRadius: HEALTH_LAYOUT.cardRadius,
          backgroundColor: chrome.cardBg,
          borderWidth: chrome.borderWidth,
          borderColor: chrome.borderColor,
        }}
        onPress={() => {
          if (!pet) return;
          router.push(
            `/(home)/health-record/${pet.id}/exam-detail?examId=${exam.id}` as any
          );
        }}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Exam Header */}
        <View className="flex-row items-center mb-3">
          <View style={{ marginRight: HEALTH_LAYOUT.iconToTitleGap }}>
            <DomainCategoryIconWell category="clinical_visits" size="lg" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
            <Text
              className="text-base font-semibold"
              style={{ color: theme.foreground }}
            >
              {exam.exam_type || "Clinical Exam"}
            </Text>
            {
              exam.exam_type?.toLowerCase().includes("invoice") && (
            <View
                  className="flex-row items-center px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(34, 197, 94, 0.25)",
                  }}
                >
                  <View
                    className="w-3.5 h-3.5 rounded-full items-center justify-center mr-1"
                    style={{ backgroundColor: "#22c55e" }}
                  >
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: "#22c55e",
                    }}
                  >
                    Paid
                  </Text>
                </View>
                )}
            </View>
            <View className="flex-row items-center mt-0.5 gap-2">
              <Text
                className="text-sm"
                style={{ color: theme.secondary }}
              >
                {formatDate(exam.exam_date, pet?.country)}
              </Text>
              {/* Validity Status Tag for Travel Documents */}
              {validityStatus && (
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: validityStatus.isValid
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{
                      color: validityStatus.isValid ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {validityStatus.text}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {hasDocument && (
            <TouchableOpacity
              style={{
                width: HEALTH_LAYOUT.overflow.size,
                height: HEALTH_LAYOUT.overflow.size,
                borderRadius: HEALTH_LAYOUT.overflow.radius,
                backgroundColor: chrome.overflowBtnBg,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
              onPress={handleViewDocument}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="document-attach" size={18} color={theme.foreground} />
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
          {
            exam.exam_type?.toLowerCase().includes("checkup") && 
          ((hasValue(exam.weight_value) || hasValue(exam.temperature) || hasValue(exam.heart_rate) || hasValue(exam.respiratory_rate))) && (
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

          {/* View Details Button */}
          {hasDetails && !showDetails && (
            <TouchableOpacity
              className="flex-row items-center justify-between py-3 mt-1"
              onPress={() => setShowDetails(true)}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: theme.foreground }}
              >
                View details
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.secondary}
              />
            </TouchableOpacity>
          )}

          {/* Collapsible Details Section */}
          {showDetails && (
            <View className="mt-4">
              {/* Findings */}
              {exam.findings && (
                <View className="mb-3">
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
                <View className="mb-3">
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
                <View className="flex-row items-center mb-3">
                  <Ionicons name="calendar-outline" size={14} color={theme.primary} />
                  <Text className="text-sm ml-2" style={{ color: theme.primary }}>
                    Follow-up: {formatDate(exam.follow_up_date, pet?.country)}
                  </Text>
                </View>
              )}

              {/* Hide Details Button */}
              <TouchableOpacity
                className="flex-row items-center justify-center py-3 px-5 rounded-full self-center mt-2"
                style={{ backgroundColor: theme.background }}
                onPress={() => setShowDetails(false)}
                activeOpacity={0.7}
              >
                <Text
                  className="text-sm font-medium mr-2"
                  style={{ color: theme.secondary }}
                >
                  Hide details
                </Text>
                <View
                  className="w-6 h-6 rounded-full items-center justify-center"
                  style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
                >
                  <Ionicons
                    name="chevron-up"
                    size={14}
                    color={theme.secondary}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Long press hint */}
        <Text
          className="text-xs text-center mt-3"
          style={{ color: theme.secondary, opacity: 0.6 }}
        >
          Tap for details · Long press for quick actions
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
