import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { formatTimeForDisplay, formatTimeToString } from "@/utils/schedules";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "../../common/DateTimePicker";

type DailyScheduleInputProps = {
  schedules: TablesInsert<"daily_medication_schedules">[];
  onChange: (schedules: TablesInsert<"daily_medication_schedules">[]) => void;
};

const DailyScheduleInput = ({
  schedules,
  onChange,
}: DailyScheduleInputProps) => {
  const { theme } = useTheme();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const handleAddTime = () => {
    setSelectedTime(new Date());
    setShowTimePicker(true);
  };

  const handleSaveTime = (date: Date) => {
    const timeString = formatTimeToString(date);

    // Check if time already exists
    const exists = schedules.some((schedule) => schedule.time === timeString);
    if (!exists) {
      onChange([...schedules, { time: timeString, medication_id: "" }]);
    }

    setShowTimePicker(false);
  };

  const handleDeleteTime = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    onChange(newSchedules);
  };

  return (
    <View>
      {/* Header with Title and Add Button */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-sm font-semibold"
          style={{ color: theme.foreground }}
        >
          Daily Schedule Times
        </Text>
        <TouchableOpacity
          className="flex-row items-center px-3 py-2 rounded-lg"
          style={{ backgroundColor: theme.primary }}
          onPress={handleAddTime}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-sm font-medium ml-1" style={{ color: "#fff" }}>
            Add Time
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
                name="time-outline"
                size={32}
                color={theme.secondary}
                style={{ marginBottom: 8 }}
              />
              <Text
                className="text-sm text-center"
                style={{ color: theme.secondary }}
              >
                No times scheduled yet
              </Text>
              <Text
                className="text-xs text-center mt-1"
                style={{ color: theme.secondary }}
              >
                Tap "Add Time" to create a schedule
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
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: theme.primary + "20" }}
                >
                  <Ionicons name="time" size={20} color={theme.primary} />
                </View>
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.foreground }}
                >
                  {formatTimeForDisplay(schedule.time)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteTime(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="p-2"
              >
                <Ionicons name="trash-outline" size={20} color={theme.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Time Picker */}
      <DateTimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSave={handleSaveTime}
        date={selectedTime}
        mode="time"
      />
    </View>
  );
};

export default DailyScheduleInput;
