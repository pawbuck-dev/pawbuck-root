import { CameraButton } from "@/components/upload/CameraButton";
import { FilesButton } from "@/components/upload/FilesButton";
import { LibraryButton } from "@/components/upload/LibraryButton";
import {
  LabResultReviewModal,
  LabResultData,
} from "@/components/lab-results/LabResultReviewModal";
import { useAuth } from "@/context/authContext";
import { useLabResults } from "@/context/labResultsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { createLabResult } from "@/services/labResults";
import { isDuplicateLabResult } from "@/utils/duplicateDetection";
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

type ProcessingStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "review"
  | "inserting"
  | "success"
  | "error";

export default function LabResultUploadModal() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedData, setExtractedData] = useState<LabResultData | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { pet } = useSelectedPet();
  const { labResults: existingLabResults } = useLabResults();
  const queryClient = useQueryClient();

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
        `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/lab-results/${Date.now()}.${extension}`
      );

      // Step 2: Extracting lab results
      setStatus("extracting");
      setStatusMessage("Extracting lab result data...");

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke<{
        confidence: number;
        labResult: {
          testType: string;
          labName: string;
          testDate: string | null;
          orderedBy?: string;
          results: Array<{
            testName: string;
            value: string;
            unit: string;
            referenceRange: string;
            status: "normal" | "low" | "high";
          }>;
        };
      }>("lab-results-ocr", {
        body: {
          bucket: "pets",
          path: data.path,
        },
      });

      if (ocrError) {
        setStatus("error");
        setStatusMessage("Failed to process document");
        Alert.alert("Error", "Failed to extract lab result data");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Step 3: Show review modal
      const labResultData: LabResultData = {
        test_type: ocrData!.labResult.testType,
        lab_name: ocrData!.labResult.labName,
        test_date: ocrData!.labResult.testDate,
        ordered_by: ocrData!.labResult.orderedBy || null,
        results: ocrData!.labResult.results,
        document_url: data.path,
        confidence: ocrData!.confidence,
      };

      setExtractedData(labResultData);
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
      Alert.alert("Error", "No image selected");
      return;
    }

    await handleUploadFile(image);
  };

  const handleUploadFromLibrary = async () => {
    const image = await pickImageFromLibrary();

    if (!image) {
      Alert.alert("Error", "No image selected");
      return;
    }

    await handleUploadFile(image);
  };

  const handlePickPdfFile = async () => {
    const file = await pickPdfFile();

    if (!file) {
      Alert.alert("Error", "No file selected");
      return;
    }

    await handleUploadFile(file);
  };

  const handleSaveLabResult = async (data: LabResultData) => {
    try {
      // Check for duplicates
      const isDuplicate = isDuplicateLabResult(
        {
          test_type: data.test_type,
          test_date: data.test_date,
          lab_name: data.lab_name,
        },
        existingLabResults
      );

      if (isDuplicate) {
        Alert.alert(
          "Duplicate Lab Result Detected",
          `A lab result for "${data.test_type}" from ${data.lab_name} on ${data.test_date ? new Date(data.test_date).toLocaleDateString() : "unknown date"} already exists.\n\nWould you like to save it anyway?`,
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
                await saveLabResultRecord(data);
              },
            },
          ]
        );
        return;
      }

      await saveLabResultRecord(data);
    } catch (error) {
      console.error("Error saving lab result:", error);
      setStatus("error");
      setStatusMessage("Failed to save lab result");
      Alert.alert("Error", "Failed to save lab result to database");
      setTimeout(() => {
        setStatus("review");
        setShowReviewModal(true);
      }, 2000);
    }
  };

  const saveLabResultRecord = async (data: LabResultData) => {
    try {
      setIsSaving(true);
      setStatus("inserting");
      setStatusMessage("Saving lab result...");

      // Save to database
      await createLabResult({
        pet_id: pet.id,
        user_id: user!.id,
        test_type: data.test_type,
        lab_name: data.lab_name,
        test_date: data.test_date,
        ordered_by: data.ordered_by,
        results: data.results,
        document_url: data.document_url,
        confidence: data.confidence,
      });

      // Refresh lab results list
      queryClient.invalidateQueries({ queryKey: ["labResults", pet.id] });

      setShowReviewModal(false);
      setStatus("success");
      setStatusMessage("Lab result added successfully!");

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Error saving lab result:", error);
      setStatus("error");
      setStatusMessage("Failed to save lab result");
      Alert.alert("Error", "Failed to save lab result to database");
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
        return "flask";
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

  // Upload Mode UI
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
            <Ionicons name="flask" size={32} color={theme.primary} />
          </View>
          <Text
            className="text-xl font-semibold text-center"
            style={{ color: theme.foreground }}
          >
            Upload Lab Result
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
          <LibraryButton
            onPress={handleUploadFromLibrary}
            disabled={isProcessing}
          />
          <FilesButton onPress={handlePickPdfFile} disabled={isProcessing} />
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          className="mt-4 p-4 rounded-xl items-center"
          style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
          onPress={() => router.back()}
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
        <LabResultReviewModal
          visible={showReviewModal}
          onClose={handleCloseReview}
          onSave={handleSaveLabResult}
          initialData={extractedData}
          loading={isSaving}
        />
      )}
    </>
  );
}

