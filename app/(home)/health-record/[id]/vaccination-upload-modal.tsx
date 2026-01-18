import { CameraButton } from "@/components/upload/CameraButton";
import { FilesButton } from "@/components/upload/FilesButton";
import { LibraryButton } from "@/components/upload/LibraryButton";
import { useAuth } from "@/context/authContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { VaccinationInsert, VaccinationOCRResponse } from "@/models/vaccination";
import { isDuplicateVaccination } from "@/utils/duplicateDetection";
import { pickPdfFile } from "@/utils/filePicker";
import { uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { supabase } from "@/utils/supabase";
import { parseVaccinationOCRResponse } from "@/utils/vaccination.ts/response";
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

export default function VaccinationUploadModal() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { user } = useAuth();
  const { pet } = useSelectedPet();
  const { vaccinations: existingVaccinations } = useVaccinations();
  const queryClient = useQueryClient();
  const [extractedVaccinations, setExtractedVaccinations] = useState<
    VaccinationInsert[]
  >([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
  const [editingDateType, setEditingDateType] = useState<"date" | "next_due_date" | null>(null);
  const [tempDate, setTempDate] = useState<string | null>(null);

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
        `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/vaccinations/${Date.now()}.${extension}`
      );

      // Step 2: Extracting
      setStatus("extracting");
      setStatusMessage("Extracting vaccination data...");

      const { data: ocrData, error: ocrError } =
        await supabase.functions.invoke<VaccinationOCRResponse>(
          "vaccination-ocr",
          {
            body: {
              bucket: "pets",
              path: data.path,
            },
          }
        );

      if (ocrError) {
        setStatus("error");
        setStatusMessage("Failed to process document");
        Alert.alert("Error", "Failed to process vaccination OCR");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      const supabaseVaccines = parseVaccinationOCRResponse(pet.id, ocrData!, data.path);

      // Store extracted data and switch to review mode
      setExtractedVaccinations(supabaseVaccines);
      setStatus("idle");
      setIsReviewMode(true);
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

  const saveVaccinationsFiltered = async (
    vaccinations: VaccinationInsert[],
    duplicatesToSkip: VaccinationInsert[]
  ) => {
    try {
      // Filter out duplicates if any
      const vaccinationsToSave = duplicatesToSkip.length > 0
        ? vaccinations.filter(
            (v) => !duplicatesToSkip.some(
              (d) => d.name.toLowerCase().trim() === v.name.toLowerCase().trim() &&
                     d.date === v.date
            )
          )
        : vaccinations;

      if (vaccinationsToSave.length === 0) {
        setStatus("error");
        setStatusMessage("All vaccinations are duplicates");
        Alert.alert("No New Records", "All vaccinations are already recorded.");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      setStatus("inserting");
      setStatusMessage(
        `Saving ${vaccinationsToSave.length} vaccination${vaccinationsToSave.length !== 1 ? "s" : ""}...`
      );

      const { error: insertError } = await supabase
        .from("vaccinations")
        .insert(vaccinationsToSave);

      if (insertError) {
        console.error("Error inserting vaccines:", insertError);
        setStatus("error");
        
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (insertError.code === "23505") {
          // Re-fetch existing vaccinations and identify which ones are duplicates
          const duplicateVaccinations = vaccinationsToSave.filter((v) =>
            isDuplicateVaccination(v, existingVaccinations)
          );
          
          const duplicateNames = duplicateVaccinations.length > 0
            ? duplicateVaccinations
                .map((v) => `• ${v.name} (${v.date ? new Date(v.date).toLocaleDateString() : "No date"})`)
                .join("\n")
            : "Unable to identify specific duplicates";
          
          setStatusMessage("One or more vaccinations already exist");
          Alert.alert(
            "Duplicate Vaccinations Found",
            `The following vaccination${duplicateVaccinations.length !== 1 ? "s are" : " is"} already recorded:\n\n${duplicateNames}`
          );
        } else {
          setStatusMessage("Failed to save vaccinations");
          Alert.alert("Error", "Failed to insert vaccines");
        }
        
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Invalidate vaccinations query to trigger refetch
      await queryClient.invalidateQueries({
        queryKey: ["vaccinations", pet.id],
      });

      // Success
      setStatus("success");
      const skippedMessage = duplicatesToSkip.length > 0
        ? ` (${duplicatesToSkip.length} duplicate${duplicatesToSkip.length > 1 ? "s" : ""} skipped)`
        : "";
      setStatusMessage(`Vaccinations added successfully!${skippedMessage}`);

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Error saving vaccinations:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to save vaccinations");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleSaveVaccinations = async () => {
    try {
      // Validate that all vaccinations have required fields
      const missingFields = extractedVaccinations
        .map((vaccination, index) => {
          const missing: string[] = [];
          if (!vaccination.name || vaccination.name.trim() === "") {
            missing.push("name");
          }
          if (!vaccination.date) {
            missing.push("date");
          }
          return missing.length > 0 ? { index: index + 1, missing } : null;
        })
        .filter((item) => item !== null);

      if (missingFields.length > 0) {
        const errorMessage = missingFields
          .map(
            (item) =>
              `Vaccination ${item!.index}: Missing ${item!.missing.join(", ")}`
          )
          .join("\n");
        setStatus("error");
        setStatusMessage("Please fill in all required fields");
        Alert.alert(
          "Validation Error",
          `Please fill in all required fields:\n\n${errorMessage}\n\nThe date field is required for all vaccinations.`,
          [{ text: "OK" }]
        );
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      await saveVaccinationsFiltered(extractedVaccinations, []);
    } catch (error) {
      console.error("Error saving vaccinations:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to save vaccinations");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleUpdateVaccination = (index: number, field: keyof VaccinationInsert, value: any) => {
    const updated = [...extractedVaccinations];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedVaccinations(updated);
  };

  const handleRemoveVaccination = (index: number) => {
    Alert.alert(
      "Remove Vaccination",
      "Are you sure you want to remove this vaccination?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updated = extractedVaccinations.filter((_, i) => i !== index);
            setExtractedVaccinations(updated);
            if (updated.length === 0) {
              setIsReviewMode(false);
            }
          },
        },
      ]
    );
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
        return "camera";
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

  // Review Mode UI
  if (isReviewMode) {
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
                setIsReviewMode(false);
                setExtractedVaccinations([]);
              }}
              disabled={isProcessing}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              Review Vaccinations
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text
            className="text-sm text-center"
            style={{ color: theme.secondary }}
          >
            {extractedVaccinations.length} vaccination
            {extractedVaccinations.length !== 1 ? "s" : ""} found
          </Text>
        </View>

        {/* Vaccinations List */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-6 gap-4">
            {extractedVaccinations.map((vaccination, index) => (
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
                    Vaccination {index + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveVaccination(index)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                {/* Vaccine Name */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Vaccine Name *
                  </Text>
                  <TextInput
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: theme.background,
                      color: theme.foreground,
                    }}
                    value={vaccination.name || ""}
                    onChangeText={(text) =>
                      handleUpdateVaccination(index, "name", text)
                    }
                    placeholder="e.g., Rabies, DHPP"
                    placeholderTextColor={theme.secondary}
                    editable={!isProcessing}
                  />
                </View>

                {/* Vaccination Date */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Vaccination Date *
                  </Text>
                  <View
                    className="p-3 rounded-lg px-4 flex-row items-center justify-between"
                    style={{ 
                      backgroundColor: theme.background,
                      borderWidth: !vaccination.date ? 1 : 0,
                      borderColor: !vaccination.date ? "#FF3B30" : "transparent"
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{ 
                        color: !vaccination.date ? "#FF3B30" : theme.foreground,
                        fontStyle: !vaccination.date ? "italic" : "normal"
                      }}
                    >
                      {formatDate(vaccination.date)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setTempDate(vaccination.date || new Date().toISOString());
                        setEditingDateIndex(index);
                        setEditingDateType("date");
                      }}
                      disabled={isProcessing}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons 
                        name="calendar-outline" 
                        size={18} 
                        color={!vaccination.date ? "#FF3B30" : theme.primary} 
                      />
                    </TouchableOpacity>
                  </View>
                  {!vaccination.date && (
                    <Text
                      className="text-xs mt-1"
                      style={{ color: "#FF3B30" }}
                    >
                      Date is required
                    </Text>
                  )}
                </View>

                {/* Next Due Date */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Next Due Date
                  </Text>
                  <View
                    className="p-3 rounded-lg px-4 flex-row items-center justify-between"
                    style={{ backgroundColor: theme.background }}
                  >
                    <Text
                      className="text-base"
                      style={{ color: theme.foreground }}
                    >
                      {formatDate(vaccination.next_due_date)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setTempDate(vaccination.next_due_date || null);
                        setEditingDateIndex(index);
                        setEditingDateType("next_due_date");
                      }}
                      disabled={isProcessing}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Vet Clinic */}
                <View className="mb-3">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Vet Clinic
                  </Text>
                  <TextInput
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: theme.background,
                      color: theme.foreground,
                    }}
                    value={vaccination.clinic_name || ""}
                    onChangeText={(text) =>
                      handleUpdateVaccination(index, "clinic_name", text)
                    }
                    placeholder="Clinic name"
                    placeholderTextColor={theme.secondary}
                    editable={!isProcessing}
                  />
                </View>

                {/* Notes */}
                <View>
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Notes
                  </Text>
                  <TextInput
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: theme.background,
                      color: theme.foreground,
                    }}
                    value={vaccination.notes || ""}
                    onChangeText={(text) =>
                      handleUpdateVaccination(index, "notes", text)
                    }
                    placeholder="Additional notes..."
                    placeholderTextColor={theme.secondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!isProcessing}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {editingDateIndex !== null && editingDateType && Platform.OS === "ios" && (
          <Modal
            transparent
            animationType="slide"
            visible={editingDateIndex !== null && editingDateType !== null}
          >
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                {/* Buttons */}
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDateIndex(null);
                      setEditingDateType(null);
                      setTempDate(null);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (editingDateIndex !== null && editingDateType && tempDate) {
                        handleUpdateVaccination(editingDateIndex, editingDateType, tempDate);
                      }
                      setEditingDateIndex(null);
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
        {editingDateIndex !== null && editingDateType && Platform.OS === "android" && (
          <DateTimePicker
            value={tempDate ? new Date(tempDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate && editingDateIndex !== null && editingDateType) {
                handleUpdateVaccination(editingDateIndex, editingDateType, selectedDate.toISOString());
              }
              setEditingDateIndex(null);
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
            onPress={handleSaveVaccinations}
            disabled={isProcessing || extractedVaccinations.length === 0}
          >
            <Text className="text-base font-semibold text-white">
              {isProcessing
                ? "Saving..."
                : `Save ${extractedVaccinations.length} Vaccination${extractedVaccinations.length !== 1 ? "s" : ""}`}
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
                {status === "inserting" && "Saving Vaccinations"}
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
            <Ionicons name="camera" size={32} color={theme.primary} />
          </View>
          <Text
            className="text-xl font-semibold text-center"
            style={{ color: theme.foreground }}
          >
            Upload Vaccination Document
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
              {status === "extracting" && "Extracting Data"}
              {status === "inserting" && "Saving Vaccinations"}
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
