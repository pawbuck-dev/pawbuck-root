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

type ViewMode = "upload" | "manual";

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

      // Step 2: Extracting (placeholder - OCR not implemented for medications yet)
      setStatus("extracting");
      setStatusMessage("Extracting medicine data...");

      // TODO: Implement medication OCR when available
      // For now, just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setStatus("success");
      setStatusMessage("Document uploaded successfully!");

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
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

      // TODO: Update this when medications table is created in Supabase
      // For now, just simulate saving
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // const { error: insertError } = await supabase
      //   .from("medications")
      //   .insert({
      //     pet_id: pet.id,
      //     name: medicationData.name,
      //     purpose: medicationData.purpose,
      //     dosage: medicationData.dosage,
      //     frequency: medicationData.frequency,
      //     start_date: medicationData.startDate,
      //     end_date: hasEndDate ? medicationData.endDate : null,
      //     prescribed_by: medicationData.prescribedBy,
      //     notes: medicationData.notes,
      //     status: hasEndDate && medicationData.endDate 
      //       ? new Date(medicationData.endDate) < new Date() ? "completed" : "active"
      //       : "active",
      //   });

      // if (insertError) {
      //   console.error("Error inserting medication:", insertError);
      //   setStatus("error");
      //   setStatusMessage("Failed to save medication");
      //   Alert.alert("Error", "Failed to save medication");
      //   setTimeout(() => setStatus("idle"), 2000);
      //   return;
      // }

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

