import { CameraButton } from "@/components/upload/CameraButton";
import { FilesButton } from "@/components/upload/FilesButton";
import { LibraryButton } from "@/components/upload/LibraryButton";
import { ManualEntryButton } from "@/components/upload/ManualEntryButton";
import { useAuth } from "@/context/authContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { pickPdfFile } from "@/utils/filePicker";
import { uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentPickerAsset } from "expo-document-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ProcessingStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "inserting"
  | "success"
  | "error";

type ViewMode = "upload" | "manual" | "review";

interface MedicationData {
  name: string;
  type: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  prescribedBy: string;
  purposeNotes: string;
}

export default function MedicationUploadModal() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { user } = useAuth();
  const { pet } = useSelectedPet();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("upload");

  // Manual entry state
  const [medicationData, setMedicationData] = useState<MedicationData>({
    name: "",
    type: "Tablet",
    dosage: "",
    frequency: "Daily",
    startDate: new Date().toISOString(),
    endDate: null,
    prescribedBy: "",
    purposeNotes: "",
  });
  const [editingDateType, setEditingDateType] = useState<"startDate" | "endDate" | null>(null);
  const [tempDate, setTempDate] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  // OCR extracted medications
  const [extractedMedications, setExtractedMedications] = useState<MedicationData[]>([]);
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);

  const medicationTypes = ["Tablet", "Capsule", "Liquid", "Injection", "Topical", "Chewable", "Other"];
  const frequencies = ["Daily", "Twice Daily", "Three Times Daily", "Weekly", "Bi-weekly", "Monthly", "As Needed"];

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
        `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/medications/${Date.now()}.${extension}`
      );

      // Step 2: Extracting
      setStatus("extracting");
      setStatusMessage("Extracting medicine data...");

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke<{
        confidence: number;
        medicines: Array<{
          name: string;
          type: string;
          dosage: string;
          frequency: string;
          purpose_notes?: string;
          prescribed_by?: string;
          start_date?: string | null;
          end_date?: string | null;
        }>;
      }>("medication-ocr", {
        body: {
          bucket: "pets",
          path: data.path,
        },
      });

      if (ocrError) {
        setStatus("error");
        setStatusMessage("Failed to process document");
        Alert.alert("Error", "Failed to extract medication data");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Convert extracted data to our format
      const medications: MedicationData[] = ocrData!.medicines.map((med) => ({
        name: med.name,
        type: med.type,
        dosage: med.dosage,
        frequency: med.frequency,
        startDate: med.start_date || new Date().toISOString(),
        endDate: med.end_date || null,
        prescribedBy: med.prescribed_by || "",
        purposeNotes: med.purpose_notes || "",
      }));

      // Store extracted data and switch to review mode
      setExtractedMedications(medications);
      setExtractionConfidence(ocrData!.confidence);
      setStatus("idle");
      setViewMode("review");
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

  const handleManualEntry = () => {
    setViewMode("manual");
  };

  const handleUpdateMedication = (index: number, field: keyof MedicationData, value: any) => {
    const updated = [...extractedMedications];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedMedications(updated);
  };

  const handleRemoveMedication = (index: number) => {
    Alert.alert(
      "Remove Medicine",
      "Are you sure you want to remove this medicine?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updated = extractedMedications.filter((_, i) => i !== index);
            setExtractedMedications(updated);
            if (updated.length === 0) {
              setViewMode("upload");
            }
          },
        },
      ]
    );
  };

  const handleSaveExtractedMedications = async () => {
    try {
      setStatus("inserting");
      setStatusMessage(
        `Saving ${extractedMedications.length} medicine${extractedMedications.length !== 1 ? "s" : ""}...`
      );

      // Prepare medicines for insertion
      const medicinesToInsert = extractedMedications.map((med) => ({
        pet_id: pet.id,
        user_id: user?.id,
        name: med.name,
        type: med.type,
        dosage: med.dosage,
        frequency: med.frequency,
        start_date: med.startDate,
        end_date: med.endDate,
        prescribed_by: med.prescribedBy || null,
        purpose: med.purposeNotes || null,
        reminder_enabled: true,
        reminder_timing: 'Day of',
      }));

      const { error: insertError } = await supabase
        .from("medicines")
        .insert(medicinesToInsert);

      if (insertError) {
        console.error("Error inserting medicines:", insertError);
        setStatus("error");
        setStatusMessage("Failed to save medicines");
        Alert.alert("Error", "Failed to save medicines");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Invalidate medicines query to trigger refetch
      await queryClient.invalidateQueries({
        queryKey: ["medicines", pet.id],
      });

      // Success
      setStatus("success");
      setStatusMessage("Medicines added successfully!");

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Error saving medicines:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to save medicines");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleSaveMedication = async () => {
    // Validate required fields
    if (!medicationData.name.trim()) {
      Alert.alert("Validation Error", "Please enter medicine name");
      return;
    }

    if (!medicationData.dosage.trim()) {
      Alert.alert("Validation Error", "Please enter dosage");
      return;
    }

    try {
      setStatus("inserting");
      setStatusMessage("Saving medicine...");

      const { error: insertError } = await supabase
        .from("medicines")
        .insert({
          pet_id: pet.id,
          user_id: user?.id,
          name: medicationData.name,
          type: medicationData.type,
          dosage: medicationData.dosage,
          frequency: medicationData.frequency,
          start_date: medicationData.startDate,
          end_date: medicationData.endDate,
          prescribed_by: medicationData.prescribedBy || null,
          purpose: medicationData.purposeNotes || null,
          reminder_enabled: true,
          reminder_timing: 'Day of',
        });

      if (insertError) {
        console.error("Error inserting medicine:", insertError);
        setStatus("error");
        setStatusMessage("Failed to save medicine");
        Alert.alert("Error", "Failed to save medicine");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Invalidate medicines query to trigger refetch
      await queryClient.invalidateQueries({
        queryKey: ["medicines", pet.id],
      });

      // Success
      setStatus("success");
      setStatusMessage("Medicine added successfully!");

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Error saving medicine:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to save medicine");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const isProcessing = status !== "idle";

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
        return "medkit";
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  // Review Mode UI (for OCR extracted medications)
  if (viewMode === "review") {
    return (
      <View style={{ backgroundColor: theme.background }} className="flex-1">
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.background,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => {
                setViewMode("upload");
                setExtractedMedications([]);
              }}
              disabled={isProcessing}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              Review Medicines
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text
            className="text-sm text-center"
            style={{ color: theme.secondary }}
          >
            {extractedMedications.length} medicine{extractedMedications.length !== 1 ? "s" : ""} found • {extractionConfidence}% confidence
          </Text>
        </View>

        {/* Medications List */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-6 gap-4">
            {extractedMedications.map((medication, index) => (
              <View
                key={index}
                className="p-4 rounded-xl"
                style={{ backgroundColor: theme.card }}
              >
                {/* Header with remove button */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.secondary }}
                  >
                    Medicine {index + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveMedication(index)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                {/* Medicine Name */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Medicine Name *
                  </Text>
                  <TextInput
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: theme.background,
                      color: theme.foreground,
                    }}
                    value={medication.name}
                    onChangeText={(text) =>
                      handleUpdateMedication(index, "name", text)
                    }
                    placeholder="e.g., Amoxicillin"
                    placeholderTextColor={theme.secondary}
                    editable={!isProcessing}
                  />
                </View>

                {/* Type */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Type *
                  </Text>
                  <TouchableOpacity
                    className="w-full rounded-xl py-4 px-4 flex-row items-center justify-between"
                    style={{
                      backgroundColor: theme.background,
                    }}
                    onPress={() => setShowTypePicker(true)}
                    disabled={isProcessing}
                  >
                    <Text
                      className="text-base"
                      style={{ color: theme.foreground }}
                    >
                      {medication.type}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.secondary} />
                  </TouchableOpacity>
                </View>

                {/* Dosage */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Dosage *
                  </Text>
                  <TextInput
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: theme.background,
                      color: theme.foreground,
                    }}
                    value={medication.dosage}
                    onChangeText={(text) =>
                      handleUpdateMedication(index, "dosage", text)
                    }
                    placeholder="e.g., 250mg, 1 tablet"
                    placeholderTextColor={theme.secondary}
                    editable={!isProcessing}
                  />
                </View>

                {/* Frequency */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Frequency *
                  </Text>
                  <TouchableOpacity
                    className="w-full rounded-xl py-4 px-4 flex-row items-center justify-between"
                    style={{
                      backgroundColor: theme.background,
                    }}
                    onPress={() => setShowFrequencyPicker(true)}
                    disabled={isProcessing}
                  >
                    <Text
                      className="text-base"
                      style={{ color: theme.foreground }}
                    >
                      {medication.frequency}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.secondary} />
                  </TouchableOpacity>
                </View>

                {/* Start Date */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Start Date
                  </Text>
                  <View
                    className="p-3 rounded-xl px-4 flex-row items-center justify-between"
                    style={{ backgroundColor: theme.background }}
                  >
                    <Text
                      className="text-base"
                      style={{ color: theme.foreground }}
                    >
                      {formatDate(medication.startDate)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setTempDate(medication.startDate);
                        setEditingDateType("startDate");
                      }}
                      disabled={isProcessing}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* End Date */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    End Date (Optional)
                  </Text>
                  <View
                    className="p-3 rounded-xl px-4 flex-row items-center justify-between"
                    style={{ backgroundColor: theme.background }}
                  >
                    <Text
                      className="text-base"
                      style={{ color: medication.endDate ? theme.foreground : theme.secondary }}
                    >
                      {medication.endDate ? formatDate(medication.endDate) : "Leave blank if ongoing"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setTempDate(medication.endDate || new Date().toISOString());
                        setEditingDateType("endDate");
                      }}
                      disabled={isProcessing}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Prescribed By */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Prescribed By (Optional)
                  </Text>
                  <TextInput
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: theme.background,
                      color: theme.foreground,
                    }}
                    value={medication.prescribedBy}
                    onChangeText={(text) =>
                      handleUpdateMedication(index, "prescribedBy", text)
                    }
                    placeholder="Vet clinic name"
                    placeholderTextColor={theme.secondary}
                    editable={!isProcessing}
                  />
                </View>

                {/* Purpose/Notes */}
                <View>
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Purpose/Notes (Optional)
                  </Text>
                  <TextInput
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: theme.background,
                      color: theme.foreground,
                    }}
                    value={medication.purposeNotes}
                    onChangeText={(text) =>
                      handleUpdateMedication(index, "purposeNotes", text)
                    }
                    placeholder="e.g., Ear infection, pain relief"
                    placeholderTextColor={theme.secondary}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    editable={!isProcessing}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View className="p-6 pt-4 border-t" style={{ borderTopColor: theme.background }}>
          <TouchableOpacity
            className="p-4 rounded-xl items-center"
            style={{
              backgroundColor: isProcessing
                ? theme.secondary + "40"
                : theme.primary,
            }}
            onPress={handleSaveExtractedMedications}
            disabled={isProcessing || extractedMedications.length === 0}
          >
            <Text className="text-base font-semibold text-white">
              {isProcessing
                ? "Saving..."
                : `Save ${extractedMedications.length} Medicine${extractedMedications.length !== 1 ? "s" : ""}`}
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
                {status === "inserting" && "Saving Medicines"}
                {status === "success" && "Success!"}
                {status === "error" && "Error"}
              </Text>

              <Text
                className="text-sm text-center"
                style={{ color: theme.secondary }}
              >
                {statusMessage}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Manual Entry Mode UI
  if (viewMode === "manual") {
    return (
      <View style={{ backgroundColor: theme.background }} className="flex-1">
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.background,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => {
                setViewMode("upload");
                setMedicationData({
                  name: "",
                  type: "Tablet",
                  dosage: "",
                  frequency: "Daily",
                  startDate: new Date().toISOString(),
                  endDate: null,
                  prescribedBy: "",
                  purposeNotes: "",
                });
              }}
              disabled={isProcessing}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              Add Medicine
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text
            className="text-sm text-center"
            style={{ color: theme.secondary }}
          >
            Enter medicine details
          </Text>
        </View>

        {/* Form */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-6 gap-4">
            {/* Medicine Name */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Medicine Name *
              </Text>
              <TextInput
                className="w-full rounded-xl py-4 px-4 text-start"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={medicationData.name}
                onChangeText={(text) =>
                  setMedicationData({ ...medicationData, name: text })
                }
                placeholder="e.g., Amoxicillin, Flea treatment"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
            </View>

            {/* Type */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Type *
              </Text>
              <TouchableOpacity
                className="w-full rounded-xl py-4 px-4 flex-row items-center justify-between"
                style={{
                  backgroundColor: theme.card,
                }}
                onPress={() => setShowTypePicker(true)}
                disabled={isProcessing}
              >
                <Text
                  className="text-base"
                  style={{ color: theme.foreground }}
                >
                  {medicationData.type}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            {/* Dosage */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Dosage *
              </Text>
              <TextInput
                className="w-full rounded-xl py-4 px-4 text-start"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={medicationData.dosage}
                onChangeText={(text) =>
                  setMedicationData({ ...medicationData, dosage: text })
                }
                placeholder="e.g., 250mg, 1 tablet, 2 mL"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
            </View>

            {/* Frequency */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Frequency *
              </Text>
              <TouchableOpacity
                className="w-full rounded-xl py-4 px-4 flex-row items-center justify-between"
                style={{
                  backgroundColor: theme.card,
                }}
                onPress={() => setShowFrequencyPicker(true)}
                disabled={isProcessing}
              >
                <Text
                  className="text-base"
                  style={{ color: theme.foreground }}
                >
                  {medicationData.frequency}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            {/* Start Date */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Start Date *
              </Text>
              <View
                className="p-3 rounded-xl px-4 flex-row items-center justify-between"
                style={{ backgroundColor: theme.card }}
              >
                <Text
                  className="text-base"
                  style={{ color: theme.foreground }}
                >
                  {formatDate(medicationData.startDate)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTempDate(medicationData.startDate);
                    setEditingDateType("startDate");
                  }}
                  disabled={isProcessing}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* End Date */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                End Date (Optional)
              </Text>
              <View
                className="p-3 rounded-xl px-4 flex-row items-center justify-between"
                style={{ backgroundColor: theme.card }}
              >
                <Text
                  className="text-base"
                  style={{ color: medicationData.endDate ? theme.foreground : theme.secondary }}
                >
                  {medicationData.endDate ? formatDate(medicationData.endDate) : "Leave blank if ongoing"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTempDate(medicationData.endDate || new Date().toISOString());
                    setEditingDateType("endDate");
                  }}
                  disabled={isProcessing}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Prescribed By */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Prescribed By (Optional)
              </Text>
              <TextInput
                className="w-full rounded-xl py-4 px-4 text-start"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={medicationData.prescribedBy}
                onChangeText={(text) =>
                  setMedicationData({ ...medicationData, prescribedBy: text })
                }
                placeholder="Vet clinic name"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
            </View>

            {/* Purpose/Notes */}
            <View>
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Purpose/Notes (Optional)
              </Text>
              <TextInput
                className="w-full rounded-xl py-4 px-4 text-start"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={medicationData.purposeNotes}
                onChangeText={(text) =>
                  setMedicationData({ ...medicationData, purposeNotes: text })
                }
                placeholder="e.g., Ear infection, Flea & tick prevention"
                placeholderTextColor={theme.secondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isProcessing}
              />
            </View>
          </View>
        </ScrollView>

        {/* Type Picker Modal */}
        <Modal
          visible={showTypePicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowTypePicker(false)}
        >
          <View
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <View
              className="w-11/12 max-w-md rounded-3xl p-6"
              style={{ backgroundColor: theme.background }}
            >
              <View className="flex-row justify-between items-center mb-6">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.foreground }}
                >
                  Select Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTypePicker(false)}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {medicationTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      setMedicationData({ ...medicationData, type });
                      setShowTypePicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: medicationData.type === type ? theme.primary : theme.foreground,
                        fontWeight: medicationData.type === type ? "600" : "normal",
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Frequency Picker Modal */}
        <Modal
          visible={showFrequencyPicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowFrequencyPicker(false)}
        >
          <View
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <View
              className="w-11/12 max-w-md rounded-3xl p-6"
              style={{ backgroundColor: theme.background }}
            >
              <View className="flex-row justify-between items-center mb-6">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.foreground }}
                >
                  Select Frequency
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFrequencyPicker(false)}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {frequencies.map((frequency) => (
                  <TouchableOpacity
                    key={frequency}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      setMedicationData({ ...medicationData, frequency });
                      setShowFrequencyPicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: medicationData.frequency === frequency ? theme.primary : theme.foreground,
                        fontWeight: medicationData.frequency === frequency ? "600" : "normal",
                      }}
                    >
                      {frequency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Date Picker Modal */}
        {editingDateType && Platform.OS === "ios" && (
          <Modal
            transparent
            animationType="slide"
            visible={editingDateType !== null}
          >
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                {/* Buttons */}
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDateType(null);
                      setTempDate(null);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (editingDateType && tempDate) {
                        setMedicationData({ ...medicationData, [editingDateType]: tempDate });
                      }
                      setEditingDateType(null);
                      setTempDate(null);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
                {/* Date Picker */}
                <DateTimePicker
                  value={tempDate ? new Date(tempDate) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempDate(selectedDate.toISOString());
                    }
                  }}
                  textColor={theme.foreground}
                />
              </View>
            </View>
          </Modal>
        )}
        {editingDateType && Platform.OS === "android" && (
          <DateTimePicker
            value={tempDate ? new Date(tempDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate && editingDateType) {
                setMedicationData({ ...medicationData, [editingDateType]: selectedDate.toISOString() });
              }
              setEditingDateType(null);
              setTempDate(null);
            }}
          />
        )}

        {/* Save Button */}
        <View className="p-6 pt-4 border-t" style={{ borderTopColor: theme.background }}>
          <TouchableOpacity
            className="p-4 rounded-xl items-center"
            style={{
              backgroundColor: isProcessing
                ? theme.secondary + "40"
                : theme.primary,
            }}
            onPress={handleSaveMedication}
            disabled={isProcessing}
          >
            <Text className="text-base font-semibold text-white">
              {isProcessing ? "Saving..." : "Save Medicine"}
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
              {status === "inserting" && "Saving Medicine"}
              {status === "success" && "Success!"}
              {status === "error" && "Error"}
            </Text>

              <Text
                className="text-sm text-center"
                style={{ color: theme.secondary }}
              >
                {statusMessage}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Upload Mode UI
  return (
    <View style={{ backgroundColor: theme.background }} className="flex-1">
      <View className="p-6 pt-8">
        {/* Header */}
        <View className="items-center mb-6">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
          >
            <Ionicons name="medkit" size={32} color={theme.primary} />
          </View>
          <Text
            className="text-xl font-semibold text-center"
            style={{ color: theme.foreground }}
          >
            Add Medication
          </Text>
          <Text
            className="text-sm text-center mt-2"
            style={{ color: theme.secondary }}
          >
            Choose how you'd like to add your medication
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
          <ManualEntryButton onPress={handleManualEntry} disabled={isProcessing} />
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
              {status === "extracting" && "Extracting Data"}
              {status === "inserting" && "Saving Medicine"}
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
  );
}

