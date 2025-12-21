import { MEDICATION_TYPES } from "@/constants/medicines";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { formatDate } from "@/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "../common/DateTimePicker";
import MedicineTypePicker from "./MedicineTypePicker";

interface MedicineFormProps {
  isProcessing: boolean;
  onSave: (data: TablesInsert<"medicines">) => void;
  initialData?: TablesInsert<"medicines">;
  onClose: () => void;
  loading: boolean;
  actionTitle: "Edit" | "Add";
}

const MedicineForm = ({
  isProcessing,
  initialData,
  onSave,
  onClose,
  loading,
  actionTitle,
}: MedicineFormProps) => {
  const { theme } = useTheme();
  const { pet } = useSelectedPet();

  if (!initialData) {
    initialData = {
      pet_id: pet?.id || "",
      name: "",
      start_date: new Date().toISOString(),
      end_date: null,
      document_url: null,
      dosage: "",
      frequency: "",
      prescribed_by: null,
      purpose: null,
      type: "",
    };
  }

  //   const [dailyScheduledTimes, setDailyScheduledTimes] = useState<
  //     TablesInsert<"daily_medication_schedules">[]
  //   >([]);
  //   const [weeklyScheduledTimes, setWeeklyScheduledTimes] = useState<
  //     TablesInsert<"weekly_medication_schedules">[]
  //   >([]);
  //   const [monthlyScheduledTimes, setMonthlyScheduledTimes] = useState<
  //     TablesInsert<"monthly_medication_schedules">[]
  //   >([]);

  const [data, setData] = useState<TablesInsert<"medicines">>(initialData);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingDateType, setEditingDateType] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [editingDate, setEditingDate] = useState<Date | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  return (
    <>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ backgroundColor: theme.background }}
      >
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.background,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text className="text-base" style={{ color: theme.primary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              {actionTitle} Medicine
            </Text>
            <TouchableOpacity onPress={() => onSave(data)} disabled={loading}>
              <Text className="text-base" style={{ color: theme.primary }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          className="flex-1 h-full"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: theme.background }}
        >
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
                value={data.name}
                onChangeText={(text) => setData({ ...data, name: text })}
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
                <Text className="text-base" style={{ color: theme.foreground }}>
                  {data.type}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.secondary}
                />
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
                value={data.dosage}
                onChangeText={(text) => setData({ ...data, dosage: text })}
                placeholder="e.g., 250mg, 1 tablet, 2 mL"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
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
                <Text className="text-base" style={{ color: theme.foreground }}>
                  {formatDate(data.start_date)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingDateType("startDate");
                    setEditingDate(null);
                    if (data.start_date) {
                      setEditingDate(new Date(data.start_date));
                    }

                    setShowDatePicker(true);
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
                  style={{
                    color: data.end_date ? theme.foreground : theme.secondary,
                  }}
                >
                  {data.end_date
                    ? formatDate(data.end_date)
                    : "Leave blank if ongoing"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingDateType("endDate");
                    setEditingDate(null);
                    if (data.end_date) {
                      setEditingDate(new Date(data.end_date));
                    }
                    setShowDatePicker(true);
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
                value={data.prescribed_by || ""}
                onChangeText={(text) =>
                  setData({ ...data, prescribed_by: text })
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
                value={data.purpose || ""}
                onChangeText={(text) => setData({ ...data, purpose: text })}
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

        {/* Date Picker */}
        <DateTimePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSave={(date: Date) => {
            setShowDatePicker(false);
            if (editingDateType === "startDate") {
              setData({
                ...data,
                start_date: date.toISOString(),
              });
            } else if (editingDateType === "endDate") {
              setData({
                ...data,
                end_date: date.toISOString(),
              });
            }
          }}
          date={editingDate || new Date()}
          mode="date"
        />

        {/* Type Picker */}
        <MedicineTypePicker
          showTypePicker={showTypePicker}
          setShowTypePicker={setShowTypePicker}
          onSelectType={(type) => {
            setData({ ...data, type });
            setShowTypePicker(false);
          }}
          selectedType={data.type as MEDICATION_TYPES}
        />
      </KeyboardAvoidingView>
    </>
  );
};

export default MedicineForm;
