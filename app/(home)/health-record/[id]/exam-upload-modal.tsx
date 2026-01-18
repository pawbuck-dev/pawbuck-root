import { ClinicalExamReviewModal } from "@/components/clinical-exams/ClinicalExamReviewModal";
import { CameraButton } from "@/components/upload/CameraButton";
import { FilesButton } from "@/components/upload/FilesButton";
import { LibraryButton } from "@/components/upload/LibraryButton";
import { useAuth } from "@/context/authContext";
import { useClinicalExams } from "@/context/clinicalExamsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { ClinicalExamData, ClinicalExamOCRResponse } from "@/models/clinicalExam";
import { createClinicalExam } from "@/services/clinicalExams";
import { isDuplicateClinicalExam } from "@/utils/duplicateDetection";
import { pickPdfFile } from "@/utils/filePicker";
import { uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentPickerAsset } from "expo-document-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ExamDocumentType = "routine_checkup" | "travel_certificate" | "invoice";

interface DocumentTypeOption {
  type: ExamDocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    type: "routine_checkup",
    label: "Routine Checkup",
    icon: "document-text",
  },
  {
    type: "travel_certificate",
    label: "Travel Certificate",
    icon: "airplane",
  },
  {
    type: "invoice",
    label: "Invoice",
    icon: "receipt",
  },
];

type ProcessingStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "review"
  | "inserting"
  | "success"
  | "error";

export default function ExamUploadModal() {
  const { theme } = useTheme();
  const [selectedType, setSelectedType] = useState<ExamDocumentType | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedData, setExtractedData] = useState<ClinicalExamData | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { pet } = useSelectedPet();
  const { clinicalExams: existingExams } = useClinicalExams();
  const queryClient = useQueryClient();

  const handleSelectType = (type: ExamDocumentType) => {
    setSelectedType(type);
  };

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      router.back();
    }
  };

  const getSelectedTypeLabel = () => {
    const selected = DOCUMENT_TYPES.find((t) => t.type === selectedType);
    return selected?.label || "";
  };

  const handleUploadFile = async (
    file: ImagePickerAsset | DocumentPickerAsset
  ) => {
    try {
      // Step 1: Uploading
      setStatus("uploading");
      setStatusMessage("Uploading document...");

      const extension = file.mimeType?.split("/")[1];
      const data = await uploadFile(
        file,
        `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/clinical-exams/${Date.now()}.${extension}`
      );

      // Step 2: Extracting
      setStatus("extracting");
      setStatusMessage("Extracting exam data...");

      const { data: ocrData, error: ocrError } =
        await supabase.functions.invoke<ClinicalExamOCRResponse>(
          "clinical-exam-ocr",
          {
            body: {
              bucket: "pets",
              path: data.path,
              exam_type: getSelectedTypeLabel(),
            },
          }
        );

      if (ocrError) {
        setStatus("error");
        setStatusMessage("Failed to process document");
        Alert.alert("Error", "Failed to extract exam data");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Step 3: Show review modal
      const examData: ClinicalExamData = {
        exam_type: ocrData!.exam.exam_type || getSelectedTypeLabel(),
        exam_date: ocrData!.exam.exam_date,
        clinic_name: ocrData!.exam.clinic_name,
        vet_name: ocrData!.exam.vet_name,
        weight_value: ocrData!.exam.weight_value,
        weight_unit: ocrData!.exam.weight_unit,
        temperature: ocrData!.exam.temperature,
        heart_rate: ocrData!.exam.heart_rate,
        respiratory_rate: ocrData!.exam.respiratory_rate,
        findings: ocrData!.exam.findings,
        notes: ocrData!.exam.notes,
        follow_up_date: ocrData!.exam.follow_up_date,
        document_url: data.path,
        validity_date: ocrData?.exam.validity_date || null,
      };

      setExtractedData(examData);
      setStatus("review");
      setShowReviewModal(true);
    } catch (error) {
      console.error("Error uploading file:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to upload file");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleTakePhoto = async () => {
    const image = await takePhoto();
    if (!image) {
      return;
    }
    await handleUploadFile(image);
  };

  const handleUploadFromLibrary = async () => {
    const image = await pickImageFromLibrary();
    if (!image) {
      return;
    }
    await handleUploadFile(image);
  };

  const handlePickPdfFile = async () => {
    const file = await pickPdfFile();
    if (!file) {
      return;
    }
    await handleUploadFile(file);
  };

  const handleSaveExam = async (data: ClinicalExamData) => {
    try {
      const examDate = data.exam_date || new Date().toISOString().split('T')[0];
      
      // Check for duplicates
      const isDuplicate = isDuplicateClinicalExam(
        { exam_type: data.exam_type, exam_date: examDate },
        existingExams
      );

      if (isDuplicate) {
        Alert.alert(
          "Duplicate Exam Detected",
          `An exam record for "${data.exam_type}" on ${new Date(examDate).toLocaleDateString()} already exists.\n\nWould you like to save it anyway?`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                setStatus("review");
              },
            },
            {
              text: "Save Anyway",
              style: "destructive",
              onPress: async () => {
                await saveExamRecord(data, examDate);
              },
            },
          ]
        );
        return;
      }

      await saveExamRecord(data, examDate);
    } catch (error) {
      console.error("Error saving clinical exam:", error);
      setStatus("error");
      setStatusMessage("Failed to save exam record");
      Alert.alert("Error", "Failed to save exam record to database");
      setTimeout(() => {
        setStatus("review");
        setShowReviewModal(true);
      }, 2000);
    }
  };

  const saveExamRecord = async (data: ClinicalExamData, examDate: string) => {
    try {
      setIsSaving(true);
      setStatus("inserting");
      setStatusMessage("Saving exam record...");

      // Save to database
      await createClinicalExam({
        pet_id: pet.id,
        user_id: user!.id,
        exam_type: data.exam_type,
        exam_date: examDate,
        clinic_name: data.clinic_name,
        vet_name: data.vet_name,
        weight_value: data.weight_value,
        weight_unit: data.weight_unit,
        temperature: data.temperature,
        heart_rate: data.heart_rate,
        respiratory_rate: data.respiratory_rate,
        findings: data.findings,
        notes: data.notes,
        follow_up_date: data.follow_up_date,
        document_url: data.document_url,
        created_at: new Date().toISOString(),
        validity_date: data.validity_date ?? null,
      });

      // Refresh clinical exams list
      queryClient.invalidateQueries({ queryKey: ["clinicalExams", pet.id] });

      setShowReviewModal(false);
      setStatus("success");
      setStatusMessage("Exam record added successfully!");

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Error saving clinical exam:", error);
      setStatus("error");
      setStatusMessage("Failed to save exam record");
      Alert.alert("Error", "Failed to save exam record to database");
      setTimeout(() => {
        setStatus("review");
        setShowReviewModal(true);
      }, 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseReview = () => {
    setShowReviewModal(false);
    setStatus("idle");
    setExtractedData(null);
  };

  const isProcessing = status !== "idle" && status !== "review";

  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
        return "cloud-upload-outline";
      case "extracting":
        return "document-text-outline";
      case "inserting":
        return "save-outline";
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      default:
        return "clipboard";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "#34C759";
      case "error":
        return "#FF3B30";
      default:
        return theme.primary;
    }
  };

  // Upload Options Screen (Step 2)
  if (selectedType) {
    return (
      <>
        <View style={{ backgroundColor: theme.background }} className="flex-1">
          <View className="p-6 pt-8">
            {/* Header */}
            <View className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
              >
                <Ionicons name="camera" size={32} color={theme.primary} />
              </View>
              <Text
                className="text-xl font-semibold text-center"
                style={{ color: theme.foreground }}
              >
                Upload {getSelectedTypeLabel()} Document
              </Text>
              <Text
                className="text-sm text-center mt-2"
                style={{ color: theme.secondary }}
              >
                Choose how you'd like to add your document
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <CameraButton onPress={handleTakePhoto} disabled={isProcessing} />
              <LibraryButton onPress={handleUploadFromLibrary} disabled={isProcessing} />
              <FilesButton onPress={handlePickPdfFile} disabled={isProcessing} />
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              className="mt-4 p-4 rounded-xl items-center"
              style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
              onPress={handleBack}
              disabled={isProcessing}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: "#FF3B30" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Processing Overlay */}
          {isProcessing && (
            <View
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
            >
              <View
                className="bg-white rounded-3xl p-8 items-center mx-8"
                style={{ backgroundColor: theme.background }}
              >
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{
                    backgroundColor:
                      status === "success" || status === "error"
                        ? `${getStatusColor()}20`
                        : "rgba(95, 196, 192, 0.15)",
                  }}
                >
                  {status === "success" || status === "error" ? (
                    <Ionicons
                      name={getStatusIcon() as any}
                      size={48}
                      color={getStatusColor()}
                    />
                  ) : (
                    <ActivityIndicator size="large" color={theme.primary} />
                  )}
                </View>

                <Text
                  className="text-lg font-semibold text-center mb-2"
                  style={{ color: theme.foreground }}
                >
                  {status === "uploading" && "Uploading"}
                  {status === "extracting" && "Processing"}
                  {status === "inserting" && "Saving"}
                  {status === "success" && "Success!"}
                  {status === "error" && "Error"}
                </Text>

                <Text
                  className="text-sm text-center"
                  style={{ color: theme.secondary }}
                >
                  {statusMessage}
                </Text>

                {/* Progress Steps */}
                {status !== "success" && status !== "error" && (
                  <View className="flex-row gap-2 mt-6">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          status === "uploading" ||
                          status === "extracting" ||
                          status === "inserting"
                            ? theme.primary
                            : theme.secondary + "40",
                      }}
                    />
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          status === "extracting" || status === "inserting"
                            ? theme.primary
                            : theme.secondary + "40",
                      }}
                    />
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          status === "inserting"
                            ? theme.primary
                            : theme.secondary + "40",
                      }}
                    />
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Review Modal */}
        {extractedData && (
          <ClinicalExamReviewModal
            visible={showReviewModal}
            onClose={handleCloseReview}
            onSave={handleSaveExam}
            initialData={extractedData}
            loading={isSaving}
          />
        )}
      </>
    );
  }

  // Document Type Selection Screen (Step 1)
  return (
    <View style={{ backgroundColor: theme.background }} className="flex-1">
      <View className="p-6 pt-8">
        {/* Title */}
        <Text
          className="text-lg font-medium mb-6"
          style={{ color: theme.secondary }}
        >
          What type of document?
        </Text>

        {/* Document Type Options */}
        <View className="flex-row gap-3">
          {DOCUMENT_TYPES.map((option) => (
            <TouchableOpacity
              key={option.type}
              className="flex-1 p-4 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.card,
                minHeight: 120,
              }}
              onPress={() => handleSelectType(option.type)}
              activeOpacity={0.7}
            >
              {/* Icon Container */}
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
              >
                <Ionicons name={option.icon} size={24} color={theme.primary} />
              </View>

              {/* Label */}
              <Text
                className="text-sm font-medium text-center"
                style={{ color: theme.foreground }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          className="mt-6 p-4 rounded-xl items-center"
          style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
          onPress={() => router.back()}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: "#FF3B30" }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
