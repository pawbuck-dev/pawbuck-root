import { Platform } from "react-native";

/** Platform-specific implementation; keeps TypeScript happy (no `./DateTimePicker` stub). */
const DateTimePicker =
  Platform.OS === "ios"
    ? require("./DateTimePicker.ios").default
    : require("./DateTimePicker.android").default;

export default DateTimePicker;
