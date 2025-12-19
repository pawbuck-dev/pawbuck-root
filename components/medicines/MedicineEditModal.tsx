import { useTheme } from "@/context/themeContext";
import { Medicine } from "@/services/medicines";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface MedicineEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Medicine>) => void;
  medicine: Medicine;
  loading?: boolean;
}

// Days of week for Weekly/Bi-weekly
const daysOfWeek = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Helper to format day of month with ordinal suffix
const formatDayOfMonth = (day: number): string => {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
};

// Helper function to check if frequency requires day of week
const requiresDayOfWeek = (frequency: string): boolean => {
  return frequency === "Weekly" || frequency === "Bi-weekly";
};

// Helper function to check if frequency requires day of month
const requiresDayOfMonth = (frequency: string): boolean => {
  return frequency === "Monthly";
};

// Helper function to check if frequency requires scheduled time
const requiresScheduledTime = (frequency: string): boolean => {
  return frequency !== "As Needed";
};

// Helper function to get time slot labels based on frequency
const getTimeSlotLabels = (frequency: string): string[] => {
  switch (frequency) {
    case "Twice Daily":
      return ["Morning Dose", "Evening Dose"];
    case "Three Times Daily":
      return ["Morning Dose", "Afternoon Dose", "Evening Dose"];
    case "As Needed":
      return []; // No scheduled times for "As Needed"
    default:
      return ["Dose Time"];
  }
};

// Helper function to get number of time slots based on frequency
const getTimeSlotCount = (frequency: string): number => {
  switch (frequency) {
    case "Twice Daily":
      return 2;
    case "Three Times Daily":
      return 3;
    case "As Needed":
      return 0; // No scheduled times for "As Needed"
    default:
      return 1;
  }
};

// Helper function to format time for display (24h to 12h)
const formatTimeForDisplay = (time: string | null): string => {
  if (!time) return "Select time";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to convert Date to 24h time string
const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper function to convert 24h time string to Date
const timeStringToDate = (time: string | null): Date => {
  const date = new Date();
  if (time) {
    const [hours, minutes] = time.split(":");
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  }
  return date;
};

// Helper to initialize scheduled times from medicine data
const initializeScheduledTimes = (medicine: Medicine): (string | null)[] => {
  const requiredSlots = getTimeSlotCount(medicine.frequency);
  const existingTimes = medicine.scheduled_times || [];
  // Pad with nulls if existing times are less than required
  const times: (string | null)[] = [...existingTimes];
  while (times.length < requiredSlots) {
    times.push(null);
  }
  return times.slice(0, requiredSlots);
};

export const MedicineEditModal: React.FC<MedicineEditModalProps> = ({
  visible,
  onClose,
  onSave,
  medicine,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState(medicine.name);
  const [type, setType] = useState(medicine.type);
  const [dosage, setDosage] = useState(medicine.dosage);
  const [frequency, setFrequency] = useState(medicine.frequency);
  const [startDate, setStartDate] = useState(medicine.start_date);
  const [endDate, setEndDate] = useState(medicine.end_date);
  const [prescribedBy, setPrescribedBy] = useState(medicine.prescribed_by || "");
  const [purpose, setPurpose] = useState(medicine.purpose || "");
  const [scheduledTimes, setScheduledTimes] = useState<(string | null)[]>(
    initializeScheduledTimes(medicine)
  );
  const [scheduledDay, setScheduledDay] = useState<number | null>(medicine.scheduled_day ?? null);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(medicine.start_date);
  const [tempEndDate, setTempEndDate] = useState(medicine.end_date);
  const [editingTimeSlotIndex, setEditingTimeSlotIndex] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [showDayOfWeekPicker, setShowDayOfWeekPicker] = useState(false);
  const [showDayOfMonthPicker, setShowDayOfMonthPicker] = useState(false);

  const medicationTypes = ["Tablet", "Capsule", "Liquid", "Injection", "Topical", "Chewable", "Other"];
  const frequencies = ["Daily", "Twice Daily", "Three Times Daily", "Weekly", "Bi-weekly", "Monthly", "As Needed"];

  const handleSave = () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter the medicine name");
      return;
    }
    if (!dosage.trim()) {
      Alert.alert("Required Field", "Please enter the dosage");
      return;
    }

    // Validate day of week for Weekly/Bi-weekly
    if (requiresDayOfWeek(frequency) && scheduledDay === null) {
      Alert.alert("Required Field", "Please select a day of week");
      return;
    }

    // Validate day of month for Monthly
    if (requiresDayOfMonth(frequency) && scheduledDay === null) {
      Alert.alert("Required Field", "Please select a day of month");
      return;
    }

    // Validate scheduled times (skip for "As Needed")
    if (requiresScheduledTime(frequency)) {
      const validScheduledTimes = scheduledTimes.filter((t): t is string => t !== null);
      const requiredTimeSlots = getTimeSlotCount(frequency);
      if (validScheduledTimes.length < requiredTimeSlots) {
        Alert.alert("Required Field", "Please set all scheduled times for doses");
        return;
      }
    }

    const validScheduledTimes = scheduledTimes.filter((t): t is string => t !== null);

    const updateData: Partial<Medicine> = {
      name,
      type,
      dosage,
      frequency,
      start_date: startDate,
      end_date: endDate,
      prescribed_by: prescribedBy || null,
      purpose: purpose || null,
      scheduled_times: requiresScheduledTime(frequency) ? validScheduledTimes : null,
      scheduled_day: scheduledDay,
    };

    onSave(medicine.id, updateData);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
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
              Edit Medicine
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text
                className="text-base font-semibold"
                style={{ color: loading ? theme.secondary : theme.primary }}
              >
                {loading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Medicine Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Medicine Name *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Amoxicillin"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Type */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Type *
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowTypePicker(true)}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {type}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Dosage */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Dosage *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g., 250mg, 1 tablet"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Frequency */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Frequency *
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowFrequencyPicker(true)}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {frequency}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Day of Week (for Weekly/Bi-weekly) */}
          {requiresDayOfWeek(frequency) && (
            <View className="mb-4">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Day of Week *
              </Text>
              <TouchableOpacity
                className="p-4 rounded-xl flex-row items-center justify-between"
                style={{ backgroundColor: theme.card }}
                onPress={() => setShowDayOfWeekPicker(true)}
                disabled={loading}
              >
                <Text
                  className="text-base"
                  style={{
                    color: scheduledDay !== null ? theme.foreground : theme.secondary,
                  }}
                >
                  {scheduledDay !== null
                    ? daysOfWeek.find((d) => d.value === scheduledDay)?.label
                    : "Select day"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Day of Month (for Monthly) */}
          {requiresDayOfMonth(frequency) && (
            <View className="mb-4">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Day of Month *
              </Text>
              <TouchableOpacity
                className="p-4 rounded-xl flex-row items-center justify-between"
                style={{ backgroundColor: theme.card }}
                onPress={() => setShowDayOfMonthPicker(true)}
                disabled={loading}
              >
                <Text
                  className="text-base"
                  style={{
                    color: scheduledDay !== null ? theme.foreground : theme.secondary,
                  }}
                >
                  {scheduledDay !== null
                    ? formatDayOfMonth(scheduledDay)
                    : "Select day"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Scheduled Times (hide for "As Needed") */}
          {requiresScheduledTime(frequency) && (
            <View className="mb-4">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Scheduled Times *
              </Text>
              {getTimeSlotLabels(frequency).map((label, index) => (
                <View key={index} className="mb-2">
                  <Text
                    className="text-xs mb-1"
                    style={{ color: theme.secondary }}
                  >
                    {label}
                  </Text>
                  <TouchableOpacity
                    className="p-4 rounded-xl flex-row items-center justify-between"
                    style={{ backgroundColor: theme.card }}
                    onPress={() => {
                      setTempTime(timeStringToDate(scheduledTimes[index]));
                      setEditingTimeSlotIndex(index);
                    }}
                    disabled={loading}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: scheduledTimes[index] ? theme.foreground : theme.secondary,
                      }}
                    >
                      {formatTimeForDisplay(scheduledTimes[index])}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Start Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Start Date
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => {
                setTempStartDate(startDate);
                setShowStartDatePicker(true);
              }}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(startDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* End Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              End Date (Optional)
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => {
                setTempEndDate(endDate);
                setShowEndDatePicker(true);
              }}
              disabled={loading}
            >
              <Text
                className="text-base"
                style={{ color: endDate ? theme.foreground : theme.secondary }}
              >
                {formatDate(endDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Prescribed By */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Prescribed By
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={prescribedBy}
              onChangeText={setPrescribedBy}
              placeholder="Vet clinic name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Purpose/Notes */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Purpose/Notes
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g., Ear infection, pain relief"
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View className="h-20" />
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
                <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {medicationTypes.map((medType) => (
                  <TouchableOpacity
                    key={medType}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      setType(medType);
                      setShowTypePicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: type === medType ? theme.primary : theme.foreground,
                        fontWeight: type === medType ? "600" : "normal",
                      }}
                    >
                      {medType}
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
                <TouchableOpacity onPress={() => setShowFrequencyPicker(false)}>
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {frequencies.map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      // Reset scheduled times and day when frequency changes
                      const newTimeSlotCount = getTimeSlotCount(freq);
                      const currentTimes = [...scheduledTimes];
                      // Keep existing times if possible, otherwise fill with null
                      const newTimes: (string | null)[] = [];
                      for (let i = 0; i < newTimeSlotCount; i++) {
                        newTimes.push(currentTimes[i] || null);
                      }
                      setScheduledTimes(newTimes);
                      setScheduledDay(null);
                      setFrequency(freq);
                      setShowFrequencyPicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: frequency === freq ? theme.primary : theme.foreground,
                        fontWeight: frequency === freq ? "600" : "normal",
                      }}
                    >
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Day of Week Picker Modal */}
        <Modal
          visible={showDayOfWeekPicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDayOfWeekPicker(false)}
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
                  Select Day
                </Text>
                <TouchableOpacity onPress={() => setShowDayOfWeekPicker(false)}>
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {daysOfWeek.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      setScheduledDay(day.value);
                      setShowDayOfWeekPicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: scheduledDay === day.value ? theme.primary : theme.foreground,
                        fontWeight: scheduledDay === day.value ? "600" : "normal",
                      }}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Day of Month Picker Modal */}
        <Modal
          visible={showDayOfMonthPicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDayOfMonthPicker(false)}
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
                  Select Day of Month
                </Text>
                <TouchableOpacity onPress={() => setShowDayOfMonthPicker(false)}>
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <TouchableOpacity
                    key={day}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      setScheduledDay(day);
                      setShowDayOfMonthPicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: scheduledDay === day ? theme.primary : theme.foreground,
                        fontWeight: scheduledDay === day ? "600" : "normal",
                      }}
                    >
                      {formatDayOfMonth(day)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Start Date Picker */}
        {showStartDatePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="slide">
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setStartDate(tempStartDate);
                      setShowStartDatePicker(false);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempStartDate ? new Date(tempStartDate) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempStartDate(selectedDate.toISOString());
                    }
                  }}
                  textColor={theme.foreground}
                />
              </View>
            </View>
          </Modal>
        )}
        {showStartDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempStartDate ? new Date(tempStartDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate) {
                setStartDate(selectedDate.toISOString());
              }
              setShowStartDatePicker(false);
            }}
          />
        )}

        {/* End Date Picker */}
        {showEndDatePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="slide">
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setEndDate(tempEndDate);
                      setShowEndDatePicker(false);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempEndDate ? new Date(tempEndDate) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempEndDate(selectedDate.toISOString());
                    }
                  }}
                  textColor={theme.foreground}
                />
              </View>
            </View>
          </Modal>
        )}
        {showEndDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempEndDate ? new Date(tempEndDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate) {
                setEndDate(selectedDate.toISOString());
              }
              setShowEndDatePicker(false);
            }}
          />
        )}

        {/* Time Picker Modal */}
        {editingTimeSlotIndex !== null && Platform.OS === "ios" && (
          <Modal
            transparent
            animationType="slide"
            visible={editingTimeSlotIndex !== null}
          >
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingTimeSlotIndex(null);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (editingTimeSlotIndex !== null) {
                        const newScheduledTimes = [...scheduledTimes];
                        newScheduledTimes[editingTimeSlotIndex] = dateToTimeString(tempTime);
                        setScheduledTimes(newScheduledTimes);
                      }
                      setEditingTimeSlotIndex(null);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempTime(selectedDate);
                    }
                  }}
                  textColor={theme.foreground}
                />
              </View>
            </View>
          </Modal>
        )}
        {editingTimeSlotIndex !== null && Platform.OS === "android" && (
          <DateTimePicker
            value={tempTime}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate && editingTimeSlotIndex !== null) {
                const newScheduledTimes = [...scheduledTimes];
                newScheduledTimes[editingTimeSlotIndex] = dateToTimeString(selectedDate);
                setScheduledTimes(newScheduledTimes);
              }
              setEditingTimeSlotIndex(null);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

