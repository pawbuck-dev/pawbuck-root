import { MEDICATION_TYPES } from "@/constants/medicines";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { formatDate } from "@/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "../common/DateTimePicker/DateTimePicker";
import MedicineTypePicker from "./MedicineTypePicker";

type ReviewMedicinesProps = {
  initialMedications: TablesInsert<"medicines">[];
  extractionConfidence: number;
  isProcessing: boolean;
  handleSaveMedications: (medications: TablesInsert<"medicines">[]) => void;
};

const ReviewMedicines = ({
  initialMedications,
  extractionConfidence,
  isProcessing,
  handleSaveMedications,
}: ReviewMedicinesProps) => {
  const { theme } = useTheme();

  const [extractedMedications, setExtractedMedications] =
    useState<TablesInsert<"medicines">[]>(initialMedications);

  const handleRemoveMedication = (index: number) => {
    setExtractedMedications(extractedMedications.filter((_, i) => i !== index));
  };

  const handleUpdateMedication = (
    index: number,
    field: string,
    value: string
  ) => {
    setExtractedMedications(
      extractedMedications.map((medication, i) =>
        i === index ? { ...medication, [field]: value } : medication
      )
    );
  };

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingMedicationIndex, setEditingMedicationIndex] = useState<
    number | null
  >(null);
  const [editingDateType, setEditingDateType] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [editingDate, setEditingDate] = useState<Date | null>(null);

  return (
    <>
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
              router.back();
            }}
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
          {extractedMedications.length} medicine
          {extractedMedications.length !== 1 ? "s" : ""} found •{" "}
          {extractionConfidence}% confidence
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
                  onPress={() => {
                    setEditingMedicationIndex(index);
                    setShowTypePicker(true);
                  }}
                  disabled={isProcessing}
                >
                  <Text
                    className="text-base"
                    style={{ color: theme.foreground }}
                  >
                    {medication.type}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={theme.secondary}
                  />
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
                    {formatDate(medication.start_date)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDate(
                        medication.start_date
                          ? new Date(medication.start_date)
                          : null
                      );
                      setEditingDateType("startDate");
                    }}
                    disabled={isProcessing}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.primary}
                    />
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
                    style={{
                      color: medication.end_date
                        ? theme.foreground
                        : theme.secondary,
                    }}
                  >
                    {medication.end_date
                      ? formatDate(medication.end_date)
                      : "Leave blank if ongoing"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDate(
                        medication.end_date
                          ? new Date(medication.end_date)
                          : null
                      );
                      setEditingDateType("endDate");
                    }}
                    disabled={isProcessing}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.primary}
                    />
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
                  value={medication.prescribed_by || ""}
                  onChangeText={(text) =>
                    handleUpdateMedication(index, "prescribed_by", text)
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
                  value={medication.purpose || ""}
                  onChangeText={(text) =>
                    handleUpdateMedication(index, "purpose", text)
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
      <View
        className="p-6 pt-4 border-t"
        style={{ borderTopColor: theme.background }}
      >
        <TouchableOpacity
          className="p-4 rounded-xl items-center"
          style={{
            backgroundColor: isProcessing
              ? theme.secondary + "40"
              : theme.primary,
          }}
          onPress={() => handleSaveMedications(extractedMedications)}
          disabled={isProcessing || extractedMedications.length === 0}
        >
          <Text className="text-base font-semibold text-white">
            {isProcessing
              ? "Saving..."
              : `Save ${extractedMedications.length} Medicine${extractedMedications.length !== 1 ? "s" : ""}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Picker Modal for Review Mode */}
      {editingDateType !== null && editingMedicationIndex !== null && (
        <DateTimePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSave={(date: Date) => {
            setShowDatePicker(false);
            if (editingDateType === "startDate") {
              handleUpdateMedication(
                editingMedicationIndex,
                "start_date",
                date.toISOString()
              );
            } else if (editingDateType === "endDate") {
              handleUpdateMedication(
                editingMedicationIndex,
                "end_date",
                date.toISOString()
              );
            }
          }}
          date={editingDate || new Date()}
          mode="date"
        />
      )}

      {/* Type Picker */}
      {editingMedicationIndex !== null && (
        <MedicineTypePicker
          showTypePicker={showTypePicker}
          setShowTypePicker={setShowTypePicker}
          onSelectType={(type) =>
            handleUpdateMedication(editingMedicationIndex, "type", type)
          }
          selectedType={
            extractedMedications[editingMedicationIndex]
              .type as MEDICATION_TYPES
          }
        />
      )}
    </>
  );
};

export default ReviewMedicines;
