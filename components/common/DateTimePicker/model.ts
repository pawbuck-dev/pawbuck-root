export type DateTimePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (date: Date) => void;
  date: Date;
  mode: "date" | "time" | "datetime";
};
