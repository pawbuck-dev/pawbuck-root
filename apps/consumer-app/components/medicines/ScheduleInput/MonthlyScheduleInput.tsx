import { useTheme } from "@/context/themeContext";
import { MonthlyMedicationSchedule } from "@/models/medication";
import {
  formatTimeForDisplay,
  formatTimeToString,
  validateDayOfMonth,
} from "@/utils/schedules";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "../../common/DateTimePicker";

type MonthlyScheduleInputProps = {
  schedules: MonthlyMedicationSchedule[];
  onChange: (schedules: MonthlyMedicationSchedule[]) => void;
};

const MonthlyScheduleInput = ({
  schedules,
  onChange,
}: MonthlyScheduleInputProps) => {
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("1");
  const [selectedTime, setSelectedTime] = useState(new Date());

  const handleAddSchedule = () => {
    setSelectedDay("1");
    setSelectedTime(new Date());
    setShowAddModal(true);
  };

  const handleSaveSchedule = () => {
    const dayNumber = parseInt(selectedDay, 10);

    if (!validateDayOfMonth(dayNumber)) {
      Alert.alert("Invalid Day", "Please enter a day between 1 and 31.");
      return;
    }

    const timeString = formatTimeToString(selectedTime);

    // Check if this day/time combination already exists
    const exists = schedules.some(
      (schedule) =>
        schedule.day_of_month === dayNumber && schedule.time === timeString
    );

    if (!exists) {
      onChange([...schedules, { day_of_month: dayNumber, time: timeString }]);
    }

    setShowAddModal(false);
  };

  const handleDeleteSchedule = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    onChange(newSchedules);
  };

  const openTimePicker = () => {
    setShowAddModal(false);
    setShowTimePicker(true);
  };

  const handleTimeSelected = (date: Date) => {
    setSelectedTime(date);
    setShowTimePicker(false);
    setShowAddModal(true);
  };

  return (
    <View>
      {/* Header with Title and Add Button */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-sm font-semibold"
          style={{ color: theme.foreground }}
        >
          Monthly Schedule
        </Text>
        <TouchableOpacity
          className="flex-row items-center px-3 py-2 rounded-lg"
          style={{ backgroundColor: theme.primary }}
          onPress={handleAddSchedule}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-sm font-medium ml-1" style={{ color: "#fff" }}>
            Add Schedule
          </Text>
        </TouchableOpacity>
      </View>

      {/* Schedule List */}
      <View className="gap-2">
        {schedules.length === 0 ? (
          <View
            className="p-6 rounded-xl border"
            style={{
              backgroundColor: theme.background,
              borderColor: theme.card,
              borderWidth: 1,
            }}
          >
            <View className="items-center">
              <Ionicons
                name="calendar-number-outline"
                size={32}
                color={theme.secondary}
                style={{ marginBottom: 8 }}
              />
              <Text
                className="text-sm text-center"
                style={{ color: theme.secondary }}
              >
                No monthly schedules yet
              </Text>
              <Text
                className="text-xs text-center mt-1"
                style={{ color: theme.secondary }}
              >
                Tap "Add Schedule" to set a day and time
              </Text>
            </View>
          </View>
        ) : (
          schedules
            .sort((a, b) => a.day_of_month - b.day_of_month)
            .map((schedule, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between p-4 rounded-xl border"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.background,
                  borderWidth: 1,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: theme.primary + "20" }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: theme.primary }}
                    >
                      {schedule.day_of_month}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base font-medium"
                      style={{ color: theme.foreground }}
                    >
                      Day {schedule.day_of_month}
                    </Text>
                    <Text
                      className="text-sm mt-0.5"
                      style={{ color: theme.secondary }}
                    >
                      {formatTimeForDisplay(schedule.time)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteSchedule(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-2"
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.error}
                  />
                </TouchableOpacity>
              </View>
            ))
        )}
      </View>

      {/* Add Schedule Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: theme.background }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className="text-xl font-semibold"
                style={{ color: theme.foreground }}
              >
                Add Monthly Schedule
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            {/* Day of Month Input */}
            <Text
              className="text-xs font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Day of Month (1-31)
            </Text>
            <TextInput
              className="p-4 rounded-xl mb-4"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={selectedDay}
              onChangeText={setSelectedDay}
              keyboardType="number-pad"
              placeholder="Enter day (1-31)"
              placeholderTextColor={theme.secondary}
              maxLength={2}
            />

            {/* Time Display */}
            <Text
              className="text-xs font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Time
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl mb-4 flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={openTimePicker}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatTimeForDisplay(formatTimeToString(selectedTime))}
              </Text>
              <Ionicons name="time-outline" size={20} color={theme.primary} />
            </TouchableOpacity>

            {/* Buttons */}
            <TouchableOpacity
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.primary }}
              onPress={handleSaveSchedule}
            >
              <Text
                className="text-base font-semibold text-center"
                style={{ color: "#fff" }}
              >
                Save Schedule
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      <DateTimePicker
        visible={showTimePicker}
        onClose={() => {
          setShowTimePicker(false);
          setShowAddModal(true);
        }}
        onSave={handleTimeSelected}
        date={selectedTime}
        mode="time"
      />
    </View>
  );
};

export default MonthlyScheduleInput;
