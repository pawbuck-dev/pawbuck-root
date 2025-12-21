import { useTheme } from "@/context/themeContext";
import NativeDateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { DateTimePickerProps } from "./model";

const DateTimePicker = ({
  visible,
  onClose,
  onSave,
  date,
  mode,
}: DateTimePickerProps) => {
  const { theme } = useTheme();
  const [tempDate, setTempDate] = useState(date);
  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <View style={{ backgroundColor: theme.background }}>
          <View
            className="flex-row justify-between items-center px-4 py-2 border-b"
            style={{ borderBottomColor: theme.card }}
          >
            <TouchableOpacity
              onPress={() => {
                onClose();
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onSave(tempDate);
              }}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <NativeDateTimePicker
            value={tempDate}
            mode={mode}
            display="spinner"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate) {
                setTempDate(selectedDate);
              }
            }}
            textColor={theme.foreground}
          />
        </View>
      </View>
    </Modal>
  );
};

export default DateTimePicker;
