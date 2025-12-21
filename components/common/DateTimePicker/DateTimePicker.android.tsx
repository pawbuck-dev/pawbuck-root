import NativeDateTimePicker from "@react-native-community/datetimepicker";
import React from "react";
import { DateTimePickerProps } from "./model";

const DateTimePicker = ({
  visible,
  onSave,
  date,
  mode,
}: DateTimePickerProps) => {
  return (
    visible && (
      <NativeDateTimePicker
        value={date}
        mode={mode}
        display="default"
        onChange={(event, selectedDate) => {
          if (event.type === "set" && selectedDate) {
            onSave(selectedDate);
          }
        }}
      />
    )
  );
};

export default DateTimePicker;
