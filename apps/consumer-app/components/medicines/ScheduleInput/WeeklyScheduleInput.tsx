import { DAYS_OF_WEEK } from "@/constants/schedules";
import { useTheme } from "@/context/themeContext";
import { WeeklyMedicationSchedule } from "@/models/medication";
import {
  formatTimeForDisplay,
  formatTimeToString,
  getDayName,
} from "@/utils/schedules";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "../../common/DateTimePicker";

type WeeklyScheduleInputProps = {
  schedules: WeeklyMedicationSchedule[];
  onChange: (schedules: WeeklyMedicationSchedule[]) => void;
};

const WeeklyScheduleInput = ({
  schedules,
  onChange,
}: WeeklyScheduleInputProps) => {
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const handleAddSchedule = () => {
    setSelectedDay(1);
    setSelectedTime(new Date());
    setShowAddModal(true);
  };

  const handleSaveSchedule = () => {
    const timeString = formatTimeToString(selectedTime);

    // Check if this day/time combination already exists
    const exists = schedules.some(
      (schedule) =>
        schedule.day_of_week === selectedDay && schedule.time === timeString
    );

    if (!exists) {
      onChange([
        ...schedules,
        {
          day_of_week: selectedDay,
          time: timeString,
        },
      ]);
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
          Weekly Schedule
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
                name="calendar-outline"
                size={32}
                color={theme.secondary}
                style={{ marginBottom: 8 }}
              />
              <Text
                className="text-sm text-center"
                style={{ color: theme.secondary }}
              >
                No weekly schedules yet
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
          schedules.map((schedule, index) => (
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
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {getDayName(schedule.day_of_week)}
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
                <Ionicons name="trash-outline" size={20} color={theme.error} />
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
                Add Weekly Schedule
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            {/* Day Selector */}
            <Text
              className="text-xs font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Select Day
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {Object.entries(DAYS_OF_WEEK).map(([dayNum, dayName]) => (
                <TouchableOpacity
                  key={dayNum}
                  className="mr-2 px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor:
                      selectedDay === Number(dayNum)
                        ? theme.primary
                        : theme.card,
                  }}
                  onPress={() => setSelectedDay(Number(dayNum))}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color:
                        selectedDay === Number(dayNum)
                          ? "#fff"
                          : theme.foreground,
                    }}
                  >
                    {dayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

export default WeeklyScheduleInput;
